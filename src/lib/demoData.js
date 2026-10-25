import { monthKeyOf, toISODate } from './columns'

export function getSeedRows(targetMonthKey) {
  const now = new Date()
  const currentMonthKey = monthKeyOf(now)
  const mKey = targetMonthKey || currentMonthKey

  // Generate ISO dates within the month
  const [yearStr, monthStr] = mKey.split('-')
  const y = Number(yearStr) || now.getFullYear()
  const m = Number(monthStr) || now.getMonth() + 1

  const makeDate = (day) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${y}-${pad(m)}-${pad(day)}`
  }

  return [
    {
      id: 'demo-sale-1',
      month_key: mKey,
      position: 0,
      data: {
        date: makeDate(25),
        customer: 'Aarav Sharma',
        course: 'Full Stack Development',
        amount: 35000,
        status: 'Sale complete',
        amount_parts: [20000, 15000],
        remarks: 'Paid in 2 instalments via UPI',
      },
    },
    {
      id: 'demo-sale-2',
      month_key: mKey,
      position: 1,
      data: {
        date: makeDate(25),
        customer: 'Priya Patel',
        course: 'Data Science & AI',
        amount: 45000,
        status: 'Sale complete',
        amount_parts: [],
        remarks: 'Full payment online',
      },
    },
    {
      id: 'demo-sale-3',
      month_key: mKey,
      position: 2,
      data: {
        date: makeDate(24),
        customer: 'Rahul Verma',
        course: 'Cyber Security',
        amount: 25000,
        status: 'Half payment',
        amount_parts: [15000, 10000],
        remarks: 'Next instalment due 5 Nov',
      },
    },
    {
      id: 'demo-sale-4',
      month_key: mKey,
      position: 3,
      data: {
        date: makeDate(24),
        customer: 'Neha Gupta',
        course: 'UI/UX Design',
        amount: 30000,
        status: 'Sale complete',
        amount_parts: [],
        remarks: 'Enrolled via referral',
      },
    },
    {
      id: 'demo-sale-5',
      month_key: mKey,
      position: 4,
      data: {
        date: makeDate(23),
        customer: 'Vikram Malhotra',
        course: 'Digital Marketing',
        amount: 18000,
        status: 'Registration done',
        amount_parts: [],
        remarks: 'Token fee ₹5,000 credited',
      },
    },
    {
      id: 'demo-sale-6',
      month_key: mKey,
      position: 5,
      data: {
        date: makeDate(22),
        customer: 'Ananya Iyer',
        course: 'Data Science & AI',
        amount: 42000,
        status: 'Sale complete',
        amount_parts: [],
        remarks: 'Corporate sponsorship',
      },
    },
    {
      id: 'demo-sale-7',
      month_key: mKey,
      position: 6,
      data: {
        date: makeDate(21),
        customer: 'Rohan Mehta',
        course: 'Full Stack Development',
        amount: 35000,
        status: 'Sale complete',
        amount_parts: [18000, 17000],
        remarks: 'Weekend batch enrolled',
      },
    },
    {
      id: 'demo-sale-8',
      month_key: mKey,
      position: 7,
      data: {
        date: makeDate(20),
        customer: 'Sneha Reddy',
        course: 'UI/UX Design',
        amount: 28000,
        status: 'Half payment',
        amount_parts: [],
        remarks: 'Pending balance ₹14,000',
      },
    },
    {
      id: 'demo-sale-9',
      month_key: mKey,
      position: 8,
      data: {
        date: makeDate(19),
        customer: 'Aditya Joshi',
        course: 'Cyber Security',
        amount: 25000,
        status: 'Sale complete',
        amount_parts: [],
        remarks: 'Early bird discount applied',
      },
    },
    {
      id: 'demo-sale-10',
      month_key: mKey,
      position: 9,
      data: {
        date: makeDate(18),
        customer: 'Kavita Nair',
        course: 'Digital Marketing',
        amount: 20000,
        status: 'Registration done',
        amount_parts: [],
        remarks: 'Enrolment confirmed for Nov batch',
      },
    },
  ]
}

export function getSeedLeads() {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo-lead-1',
      name: 'Sameer Sen',
      phone: '+91 98765 43210',
      course: 'Full Stack Development',
      status: 'Interested',
      remarks: 'Requested weekend batch details',
      added_on: now,
      created_at: now,
      moved_at: null,
      deleted_at: null,
    },
    {
      id: 'demo-lead-2',
      name: 'Ritu Deshmukh',
      phone: '+91 98111 22334',
      course: 'Data Science & AI',
      status: 'Call Back',
      remarks: 'Follow up on Saturday evening',
      added_on: now,
      created_at: now,
      moved_at: null,
      deleted_at: null,
    },
    {
      id: 'demo-lead-3',
      name: 'Amitabh Roy',
      phone: '+91 98450 12345',
      course: 'Cyber Security',
      status: 'Counselled',
      remarks: 'Discussing EMI financing with family',
      added_on: now,
      created_at: now,
      moved_at: null,
      deleted_at: null,
    },
  ]
}
