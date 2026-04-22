import Student from '../models/Student'
import User from '../models/User'

const STUDENTS = [
  { studentId: 'DA-001', name: 'Ahmad Farhan' },
  { studentId: 'DA-002', name: 'Siti Nursyahirah' },
  { studentId: 'DA-003', name: 'Muhammad Haziq' },
  { studentId: 'DA-004', name: 'Nur Aisyah' },
  { studentId: 'DA-005', name: 'Khairul Anwar' },
  { studentId: 'DA-006', name: 'Farah Diyana' },
  { studentId: 'DA-007', name: 'Zulkifli Hassan' },
  { studentId: 'DA-008', name: 'Ain Nabilah' },
  { studentId: 'DA-009', name: 'Ridzwan Aziz' },
  { studentId: 'DA-010', name: 'Nurul Hidayah' },
  { studentId: 'DA-011', name: 'Hafizuddin Omar' },
  { studentId: 'DA-012', name: 'Syafiqah Rashid' },
  { studentId: 'DA-013', name: 'Amirrul Haikal' },
  { studentId: 'DA-014', name: 'Fatin Nadhirah' },
  { studentId: 'DA-015', name: 'Shahrizal Karim' },
  { studentId: 'DA-016', name: 'Noor Shafiqah' },
  { studentId: 'DA-017', name: 'Irfan Hakim' },
  { studentId: 'DA-018', name: 'Zulaika Ramli' },
  { studentId: 'DA-019', name: 'Azri Nordin' },
  { studentId: 'DA-020', name: 'Maisarah Yusof' },
]

let seeded = false

export async function seedIfNeeded() {
  if (seeded) return
  seeded = true

  const count = await Student.countDocuments()
  if (count === 0) {
    await Student.insertMany(STUDENTS.map((s, i) => ({ ...s, slotOrder: i })))
    console.log('✅ Seeded 20 students')
  }

  const adminExists = await User.countDocuments({ role: 'admin' })
  if (adminExists === 0) {
    await User.create({ username: 'admin', password: 'Admin@1234', role: 'admin' })
    console.log('✅ Default admin: admin / Admin@1234')
  }
}
