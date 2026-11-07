/**
 * ============================================================================
 *  MathClass — Classroom service  ·  v1.0.0
 * ============================================================================
 *  Adds classrooms on top of the existing portal. Each classroom has its own
 *  join code, members, resources (in upload order), announcements and grades.
 *
 *  DEPLOY (one time, ~2 minutes)
 *   1. script.google.com  →  New project  →  paste this whole file into Code.gs
 *   2. Deploy → New deployment → type "Web app"
 *        Execute as:      Me
 *        Who has access:  Anyone
 *   3. Copy the .../exec URL and paste it into CLASSROOM_URL in index.html
 *
 *  The first call creates a spreadsheet named "MathClass — Classrooms" in the
 *  owner's Drive. All classroom data lives there; nothing else is touched.
 * ============================================================================
 */

const CLASSROOM_VERSION = '1.0.0';

const TABS = {
  classrooms: {
    name: 'Classrooms',
    cols: ['id', 'code', 'name', 'subject', 'section', 'teacherId', 'teacherName', 'description', 'created_at']
  },
  members: {
    name: 'Members',
    cols: ['id', 'classroomId', 'userId', 'name', 'student_id', 'section', 'role', 'joined_at']
  },
  resources: {
    name: 'Resources',
    cols: ['id', 'classroomId', 'teacherId', 'seq', 'title', 'type', 'url', 'submissionUrl', 'deadline', 'instructions', 'created_at']
  },
  announcements: {
    name: 'Announcements',
    cols: ['id', 'classroomId', 'teacherId', 'seq', 'title', 'body', 'created_at']
  },
  grades: {
    name: 'Grades',
    cols: ['id', 'classroomId', 'studentId', 'studentName', 'student_id', 'term', 'grade', 'remarks', 'updated_at']
  },
  progress: {
    name: 'Progress',
    cols: ['id', 'classroomId', 'userId', 'resourceId', 'at']
  }
};

/* ============================== HTTP entry points ============================== */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action) return route_(p);
  return json_({ success: true, service: 'MathClass classrooms', version: CLASSROOM_VERSION });
}

function doPost(e) {
  let p = {};
  try {
    p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ success: false, message: 'Invalid request body.' });
  }
  return route_(p);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function route_(p) {
  const action = String(p.action || '').trim();
  try {
    switch (action) {
      /* ---------- teacher ---------- */
      case 'createClassroom':        return json_(withLock_(() => createClassroom_(p)));
      case 'updateClassroom':        return json_(withLock_(() => updateClassroom_(p)));
      case 'rotateClassCode':        return json_(withLock_(() => rotateClassCode_(p)));
      case 'deleteClassroom':        return json_(withLock_(() => deleteClassroom_(p)));
      case 'saveClassResource':      return json_(withLock_(() => saveClassResource_(p)));
      case 'deleteClassResource':    return json_(withLock_(() => deleteClassResource_(p)));
      case 'saveClassAnnouncement':  return json_(withLock_(() => saveClassAnnouncement_(p)));
      case 'deleteClassAnnouncement':return json_(withLock_(() => deleteClassAnnouncement_(p)));
      case 'saveClassGrade':         return json_(withLock_(() => saveClassGrade_(p)));
      case 'deleteClassGrade':       return json_(withLock_(() => deleteClassGrade_(p)));
      case 'removeClassMember':      return json_(withLock_(() => removeClassMember_(p)));
      /* ---------- student ---------- */
      case 'joinClassroom':          return json_(withLock_(() => joinClassroom_(p)));
      case 'leaveClassroom':         return json_(withLock_(() => leaveClassroom_(p)));
      case 'toggleClassTask':        return json_(withLock_(() => toggleClassTask_(p)));
      /* ---------- shared reads ---------- */
      case 'listClassrooms':         return json_(listClassrooms_(p));
      case 'classroomDetail':        return json_(classroomDetail_(p));
      /* ---------- housekeeping ---------- */
      case 'ping':                   return json_({ success: true, version: CLASSROOM_VERSION });
      default:
        return json_({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json_({ success: false, message: String(err && err.message ? err.message : err) });
  }
}

/* ============================== storage helpers ============================== */

function ss_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CLASSROOM_SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { /* deleted — make a new one */ }
  }
  const ss = SpreadsheetApp.create('MathClass — Classrooms');
  props.setProperty('CLASSROOM_SHEET_ID', ss.getId());
  return ss;
}

function tab_(key) {
  const def = TABS[key];
  const ss = ss_();
  let sh = ss.getSheetByName(def.name);
  if (!sh) {
    sh = ss.insertSheet(def.name);
    sh.appendRow(def.cols);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, def.cols.length).setFontWeight('bold');
  }
  return sh;
}

function rows_(key) {
  const def = TABS[key];
  const sh = tab_(key);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, def.cols.length).getValues();
  return values.map(row => {
    const o = {};
    def.cols.forEach((c, i) => { o[c] = row[i]; });
    return o;
  });
}

function append_(key, obj) {
  const def = TABS[key];
  const sh = tab_(key);
  sh.appendRow(def.cols.map(c => (obj[c] === undefined ? '' : obj[c])));
  return obj;
}

function update_(key, id, patch) {
  const def = TABS[key];
  const sh = tab_(key);
  const last = sh.getLastRow();
  if (last < 2) return null;
  const values = sh.getRange(2, 1, last - 1, def.cols.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) !== String(id)) continue;
    const row = values[i].slice();
    def.cols.forEach((c, j) => { if (patch[c] !== undefined) row[j] = patch[c]; });
    sh.getRange(i + 2, 1, 1, def.cols.length).setValues([row]);
    const o = {};
    def.cols.forEach((c, j) => { o[c] = row[j]; });
    return o;
  }
  return null;
}

function remove_(key, predicate) {
  const def = TABS[key];
  const sh = tab_(key);
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const values = sh.getRange(2, 1, last - 1, def.cols.length).getValues();
  let removed = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    const o = {};
    def.cols.forEach((c, j) => { o[c] = values[i][j]; });
    if (predicate(o)) { sh.deleteRow(i + 2); removed++; }
  }
  return removed;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { /* keep going — better to write than fail */ }
  try { return fn(); } finally { try { lock.releaseLock(); } catch (err) {} }
}

function nowIso_() { return new Date().toISOString(); }
function newId_(prefix) { return prefix + '_' + String(Utilities.getUuid()).slice(0, 8); }
function str_(v) { return String(v === undefined || v === null ? '' : v).trim(); }

function makeCode_() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const taken = {};
  rows_('classrooms').forEach(c => { taken[String(c.code).toUpperCase()] = true; });
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    if (!taken[code]) return code;
  }
  return 'C' + String(Date.now()).slice(-5);
}

/* ============================== access helpers ============================== */

function findClassroom_(id) {
  return rows_('classrooms').find(c => String(c.id) === String(id)) || null;
}

function isOwner_(classroom, userId) {
  return !!classroom && String(classroom.teacherId) === String(userId);
}

function membership_(classroomId, userId) {
  return rows_('members').find(m =>
    String(m.classroomId) === String(classroomId) && String(m.userId) === String(userId)
  ) || null;
}

/** owner or enrolled member, else null */
function access_(classroomId, userId) {
  const classroom = findClassroom_(classroomId);
  if (!classroom) return { error: 'That classroom no longer exists.' };
  if (isOwner_(classroom, userId)) return { classroom: classroom, role: 'teacher' };
  const member = membership_(classroomId, userId);
  if (member) return { classroom: classroom, role: 'student', member: member };
  return { error: 'You are not enrolled in this classroom.' };
}

function countsFor_(classroomId) {
  return {
    members: rows_('members').filter(m => String(m.classroomId) === String(classroomId)).length,
    resources: rows_('resources').filter(r => String(r.classroomId) === String(classroomId)).length,
    announcements: rows_('announcements').filter(a => String(a.classroomId) === String(classroomId)).length
  };
}

function decorate_(classroom, role) {
  const c = countsFor_(classroom.id);
  return {
    id: classroom.id,
    code: classroom.code,
    name: classroom.name,
    subject: classroom.subject,
    section: classroom.section,
    teacherName: classroom.teacherName,
    description: classroom.description,
    created_at: classroom.created_at,
    members: c.members,
    resources: c.resources,
    announcements: c.announcements,
    role: role
  };
}

/* ============================== teacher: classrooms ============================== */

function createClassroom_(p) {
  const userId = str_(p.userId);
  const name = str_(p.name);
  if (!userId) return { success: false, message: 'Please sign in again.' };
  if (!name) return { success: false, message: 'Give the classroom a name.' };

  const classroom = append_('classrooms', {
    id: newId_('cl'),
    code: makeCode_(),
    name: name,
    subject: str_(p.subject),
    section: str_(p.section),
    teacherId: userId,
    teacherName: str_(p.teacherName),
    description: str_(p.description),
    created_at: nowIso_()
  });

  return { success: true, classroom: decorate_(classroom, 'teacher') };
}

function updateClassroom_(p) {
  const userId = str_(p.userId);
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, userId)) return { success: false, message: 'Only the teacher who created this classroom can edit it.' };

  const patch = {};
  ['name', 'subject', 'section', 'description'].forEach(f => {
    if (p[f] !== undefined) patch[f] = str_(p[f]);
  });
  if (patch.name === '') return { success: false, message: 'The classroom needs a name.' };
  const updated = update_('classrooms', classroom.id, patch) || classroom;
  return { success: true, classroom: decorate_(updated, 'teacher') };
}

function rotateClassCode_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the owner can change the join code.' };
  const updated = update_('classrooms', classroom.id, { code: makeCode_() });
  return { success: true, classroom: decorate_(updated, 'teacher') };
}

function deleteClassroom_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the owner can delete this classroom.' };
  const id = classroom.id;
  remove_('members', m => String(m.classroomId) === String(id));
  remove_('resources', r => String(r.classroomId) === String(id));
  remove_('announcements', a => String(a.classroomId) === String(id));
  remove_('grades', g => String(g.classroomId) === String(id));
  remove_('progress', pr => String(pr.classroomId) === String(id));
  remove_('classrooms', c => String(c.id) === String(id));
  return { success: true, message: 'Classroom deleted.' };
}

function listClassrooms_(p) {
  const userId = str_(p.userId);
  const role = str_(p.role) || 'student';
  const all = rows_('classrooms');

  if (role === 'teacher') {
    const mine = all.filter(c => String(c.teacherId) === userId);
    return { success: true, classrooms: mine.map(c => decorate_(c, 'teacher')) };
  }

  const memberRows = rows_('members').filter(m => String(m.userId) === userId);
  const byId = {};
  memberRows.forEach(m => { byId[String(m.classroomId)] = m; });
  const enrolled = all.filter(c => byId[String(c.id)]);
  return { success: true, classrooms: enrolled.map(c => decorate_(c, 'student')) };
}

function removeClassMember_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the owner can remove members.' };
  const target = str_(p.memberId);
  const removed = remove_('members', m => String(m.id) === target && String(m.classroomId) === String(classroom.id));
  if (!removed) return { success: false, message: 'That member was already removed.' };
  remove_('progress', pr => String(pr.userId) === str_(p.memberUserId) && String(pr.classroomId) === String(classroom.id));
  return { success: true, message: 'Member removed.' };
}

/* ============================== resources ============================== */

function saveClassResource_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the teacher can add resources here.' };

  const title = str_(p.title);
  if (!title) return { success: false, message: 'Please enter a title.' };

  const type = str_(p.type) || 'module';
  const items = rows_('resources').filter(r => String(r.classroomId) === String(classroom.id));
  const nextSeq = items.reduce((max, r) => Math.max(max, Number(r.seq) || 0), 0) + 1;

  const resource = append_('resources', {
    id: newId_('cr'),
    classroomId: classroom.id,
    teacherId: classroom.teacherId,
    seq: nextSeq,                       /* ← upload order, never re-sorted */
    title: title,
    type: type,
    url: str_(p.url),
    submissionUrl: str_(p.submissionUrl),
    deadline: str_(p.deadline),
    instructions: str_(p.instructions),
    created_at: nowIso_()
  });

  return { success: true, resource: resource, resources: sortedResources_(classroom.id) };
}

function deleteClassResource_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the teacher can delete resources here.' };
  const id = str_(p.resourceId);
  if (!id) return { success: false, message: 'Missing resource.' };
  remove_('resources', r => String(r.id) === id && String(r.classroomId) === String(classroom.id));
  remove_('progress', pr => String(pr.resourceId) === id && String(pr.classroomId) === String(classroom.id));
  return { success: true, resources: sortedResources_(classroom.id) };
}

function sortedResources_(classroomId) {
  return rows_('resources')
    .filter(r => String(r.classroomId) === String(classroomId))
    .map(r => ({
      id: String(r.id),
      seq: Number(r.seq) || 0,
      title: r.title,
      type: r.type || 'module',
      url: r.url,
      submissionUrl: r.submissionUrl,
      deadline: r.deadline,
      instructions: r.instructions,
      created_at: r.created_at
    }))
    .sort((a, b) => a.seq - b.seq);      /* oldest upload first */
}

/* ============================== announcements ============================== */

function saveClassAnnouncement_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the teacher can post here.' };

  const title = str_(p.title);
  const body = str_(p.body);
  if (!title || !body) return { success: false, message: 'Add a title and a message.' };

  const items = rows_('announcements').filter(a => String(a.classroomId) === String(classroom.id));
  const nextSeq = items.reduce((max, a) => Math.max(max, Number(a.seq) || 0), 0) + 1;

  append_('announcements', {
    id: newId_('ca'),
    classroomId: classroom.id,
    teacherId: classroom.teacherId,
    seq: nextSeq,
    title: title,
    body: body,
    created_at: nowIso_()
  });

  return { success: true, announcements: sortedAnnouncements_(classroom.id) };
}

function deleteClassAnnouncement_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the teacher can delete announcements.' };
  remove_('announcements', a =>
    String(a.id) === str_(p.announcementId) && String(a.classroomId) === String(classroom.id));
  return { success: true, announcements: sortedAnnouncements_(classroom.id) };
}

function sortedAnnouncements_(classroomId) {
  return rows_('announcements')
    .filter(a => String(a.classroomId) === String(classroomId))
    .map(a => ({
      id: String(a.id),
      seq: Number(a.seq) || 0,
      title: a.title,
      body: a.body,
      created_at: a.created_at
    }))
    .sort((a, b) => b.seq - a.seq);      /* newest first */
}

/* ============================== grades ============================== */

function saveClassGrade_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the teacher can encode grades.' };

  const studentId = str_(p.targetStudentId);
  const term = str_(p.term);
  const grade = Number(p.grade);
  if (!studentId) return { success: false, message: 'Choose a student.' };
  if (!term) return { success: false, message: 'Choose a term.' };
  if (isNaN(grade) || grade < 0 || grade > 100) return { success: false, message: 'The grade must be between 0 and 100.' };

  const member = membership_(classroom.id, studentId);
  const existing = rows_('grades').find(g =>
    String(g.classroomId) === String(classroom.id) &&
    String(g.studentId) === studentId &&
    String(g.term) === term);

  const payload = {
    classroomId: classroom.id,
    studentId: studentId,
    studentName: member ? member.name : str_(p.studentName),
    student_id: member ? member.student_id : str_(p.student_id),
    term: term,
    grade: grade,
    remarks: str_(p.remarks),
    updated_at: nowIso_()
  };

  if (existing) update_('grades', existing.id, payload);
  else append_('grades', Object.assign({ id: newId_('cg') }, payload));

  return { success: true, grades: sortedGrades_(classroom.id) };
}

function deleteClassGrade_(p) {
  const classroom = findClassroom_(p.classroomId);
  if (!isOwner_(classroom, String(p.userId))) return { success: false, message: 'Only the teacher can delete grades.' };
  remove_('grades', g =>
    String(g.id) === str_(p.gradeId) && String(g.classroomId) === String(classroom.id));
  return { success: true, grades: sortedGrades_(classroom.id) };
}

function sortedGrades_(classroomId) {
  const terms = { 'Prelims': 1, 'Midterms': 2, 'Semi-Finals': 3, 'Finals': 4 };
  return rows_('grades')
    .filter(g => String(g.classroomId) === String(classroomId))
    .map(g => ({
      id: String(g.id),
      studentId: String(g.studentId),
      studentName: g.studentName,
      student_id: g.student_id,
      term: g.term,
      grade: Number(g.grade),
      remarks: g.remarks,
      updated_at: g.updated_at
    }))
    .sort((a, b) => {
      const byName = String(a.studentName).localeCompare(String(b.studentName));
      if (byName !== 0) return byName;
      return (terms[a.term] || 9) - (terms[b.term] || 9);
    });
}

/* ============================== enrollment / progress ============================== */

function joinClassroom_(p) {
  const userId = str_(p.userId);
  const code = str_(p.code).toUpperCase().replace(/\s+/g, '');
  if (!userId) return { success: false, message: 'Please sign in again.' };
  if (!code) return { success: false, message: 'Enter the class code your teacher gave you.' };

  const classroom = rows_('classrooms').find(c => String(c.code).toUpperCase() === code);
  if (!classroom) return { success: false, message: 'No classroom matches that code. Check it with your teacher.' };

  const already = membership_(classroom.id, userId);
  if (!already) {
    append_('members', {
      id: newId_('cm'),
      classroomId: classroom.id,
      userId: userId,
      name: str_(p.name),
      student_id: str_(p.student_id),
      section: str_(p.section),
      role: 'student',
      joined_at: nowIso_()
    });
  }

  return {
    success: true,
    already: !!already,
    classroom: decorate_(classroom, 'student')
  };
}

function leaveClassroom_(p) {
  const classroom = findClassroom_(p.classroomId);
  const userId = str_(p.userId);
  if (!classroom) return { success: false, message: 'That classroom no longer exists.' };
  if (isOwner_(classroom, userId)) return { success: false, message: 'Teachers cannot leave their own classroom — delete it instead.' };
  remove_('members', m =>
    String(m.userId) === userId && String(m.classroomId) === String(classroom.id));
  return { success: true, message: 'You left the classroom.' };
}

function toggleClassTask_(p) {
  const access = access_(p.classroomId, p.userId);
  if (access.error) return { success: false, message: access.error };
  const resourceId = str_(p.resourceId);
  const existing = rows_('progress').find(pr =>
    String(pr.classroomId) === String(access.classroom.id) &&
    String(pr.userId) === str_(p.userId) &&
    String(pr.resourceId) === resourceId);

  if (existing) {
    remove_('progress', pr => String(pr.id) === String(existing.id));
    return { success: true, status: 'removed', completedResourceIds: completedFor_(access.classroom.id, p.userId) };
  }

  append_('progress', {
    id: newId_('cp'),
    classroomId: access.classroom.id,
    userId: str_(p.userId),
    resourceId: resourceId,
    at: nowIso_()
  });
  return { success: true, status: 'added', completedResourceIds: completedFor_(access.classroom.id, p.userId) };
}

function completedFor_(classroomId, userId) {
  return rows_('progress')
    .filter(pr => String(pr.classroomId) === String(classroomId) && String(pr.userId) === String(userId))
    .map(pr => String(pr.resourceId));
}

function classroomDetail_(p) {
  const access = access_(p.classroomId, p.userId);
  if (access.error) return { success: false, message: access.error };

  const classroom = access.classroom;
  const out = {
    success: true,
    role: access.role,
    classroom: decorate_(classroom, access.role),
    resources: sortedResources_(classroom.id),
    announcements: sortedAnnouncements_(classroom.id)
  };

  if (access.role === 'teacher') {
    out.members = rows_('members')
      .filter(m => String(m.classroomId) === String(classroom.id))
      .map(m => ({
        id: String(m.id),
        userId: String(m.userId),
        name: m.name,
        student_id: m.student_id,
        section: m.section,
        joined_at: m.joined_at
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    out.grades = sortedGrades_(classroom.id);
  } else {
    out.grades = sortedGrades_(classroom.id).filter(g => String(g.studentId) === str_(p.userId));
    out.completedResourceIds = completedFor_(classroom.id, p.userId);
    out.members = countsFor_(classroom.id).members;
  }

  return out;
}
