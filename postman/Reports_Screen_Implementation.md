# Reports Screen Implementation Guide

## Overview
This document details what happens when HR clicks on the "Reports" card from the dashboard and what the Reports screen displays.

---

## Navigation Flow

### 1. From Dashboard
- User clicks **"Reports"** quick action card
- Navigation: `navigation.navigate('Reports')` 
- Screen: `ReportsScreen` component

---

## Reports Screen Structure

### Main UI Layout

```
┌─────────────────────────────────────────┐
│  Header: "Reports" + Filter Button      │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Report Type Selector (Tabs)      │ │
│  │  [All] [Job Postings] [Assignments]││
│  │  [Attendance] [No-Shows]          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Generate Report Card             │ │
│  │  - Title Input                    │ │
│  │  - Date Range Picker              │ │
│  │  - Filters (Status, Department)   │ │
│  │  - [Generate Report] Button       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Recent Reports                   │ │
│  │  ───────────────────────────────  │ │
│  │  • Job Postings - Oct 27          │ │
│  │  • Assignments - Oct 26           │ │
│  │  • Attendance - Oct 25            │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## Report Types Available

### 1. **Job Postings Report**
- **API Endpoint**: `POST /api/v1/reports/job-postings`
- **What it shows**:
  - All job postings (or filtered by date range, status, department, location)
  - Summary statistics:
    - Total jobs
    - Jobs by status (ACTIVE, ASSIGNED, COMPLETED, etc.)
    - Jobs by department
    - Jobs by location
    - Total assignments
    - Total hours worked
    - Total payment amount
  - Individual job details:
    - Job ID, title, description
    - Department, location, dates
    - Hourly rate, status
    - Creator info
    - All assignments for each job
    - Staff assigned

### 2. **Job Assignments Report**
- **API Endpoint**: `POST /api/v1/reports/job-assignments`
- **What it shows**:
  - All job assignments (or filtered)
  - Summary statistics:
    - Total assignments
    - Assignments by status (PENDING, ACCEPTED, COMPLETED, etc.)
    - Assignments by staff role (DOCTOR, NURSE)
    - Assignments by department
    - Total hours worked
    - Total payment
    - Average hours per assignment
    - Average payment per assignment
  - Individual assignment details:
    - Assignment ID, status
    - Job details (title, department, location, dates)
    - Staff info (name, email, role, department)
    - Assigner info
    - Total hours worked
    - Total payment
    - Check-in history

### 3. **Staff Performance Report**
- **API Endpoint**: `POST /api/v1/reports/staff-performance`
- **What it shows**:
  - Performance metrics for staff (doctors, nurses)
  - Summary statistics:
    - Total staff members evaluated
    - Total completed assignments
    - Average completion rate
    - Average performance score
    - Top performers
    - Department-wise performance
  - Individual staff details:
    - Name, email, role, department
    - Total jobs completed
    - Average rating
    - Total hours worked
    - On-time check-in rate
    - Latest assignments

### 4. **Attendance Report (Timesheet)**
- **API Endpoint**: `POST /api/v1/reports/attendance`
- **What it shows**:
  - Check-in/check-out records
  - Summary statistics:
    - Total check-ins
    - Total work hours
    - Total break time
    - Late arrivals count
    - Early departures count
    - Attendance rate percentage
    - Breakdown by user
    - Breakdown by department
  - Individual check-in details:
    - User info
    - Job details
    - Check-in time
    - Check-out time
    - Total work time
    - Break duration
    - Is late (yes/no)
    - Is early checkout (yes/no)

### 5. **No-Show Jobs Report**
- **API Endpoint**: `POST /api/v1/reports/no-show-jobs`
- **What it shows**:
  - Jobs that were accepted/assigned but staff didn't show up
  - Summary statistics:
    - Total no-show cases
    - Breakdown by department
    - Breakdown by staff role
    - Total expected payment lost
    - Average hours missed
  - Individual no-show details:
    - Job details (title, department, location, dates)
    - Staff info (name, email, role)
    - Assignment status
    - Expected check-in time

### 6. **Financial Report (Payout)**
- **API Endpoint**: `POST /api/v1/reports/financial`
- **What it shows**:
  - Financial summaries
  - Summary statistics:
    - Total payout amount
    - Payout by month
    - Payout by staff role
    - Payout by department
    - Pending payments
    - Completed payments
  - Individual payout details:
    - Staff info
    - Job details
    - Hours worked
    - Hourly rate
    - Total payment
    - Payment status

---

## Screen Features

### 1. **Generate Report Section**
```javascript
// Filter options for generating reports
{
  title: "My Report Title",           // User input
  parameters: {
    startDate: "2025-01-01",          // Date picker
    endDate: "2025-01-31",            // Date picker
    status: "ACTIVE",                  // Dropdown: ACTIVE, ASSIGNED, COMPLETED, etc.
    department: "General Surgery",     // Dropdown: List of departments
    location: "Bangalore",             // Input field
    userId: 5,                         // Optional: Specific user
    jobId: 123                         // Optional: Specific job
  },
  fileFormat: "JSON"                   // Dropdown: JSON, CSV, PDF, EXCEL
}
```

### 2. **Report List Display**
Shows generated reports with:
- Report title
- Report type
- Generated date & time
- Total records count
- Summary stats (preview)
- Actions: View Details, Download, Delete

### 3. **Report Details View**
When user clicks on a report:
- Full summary statistics
- Detailed data table
- Export options (Download as CSV/PDF)
- Back to list button

---

## API Integration Examples

### 1. Generate Job Postings Report
```javascript
const generateJobPostingsReport = async (filters) => {
  const response = await ApiService.post('/reports/job-postings', {
    title: filters.title,
    parameters: {
      startDate: filters.startDate,
      endDate: filters.endDate,
      status: filters.status,
      department: filters.department,
      location: filters.location
    },
    fileFormat: 'JSON'
  });
  
  return response.report;
};

// Response:
{
  message: "Job postings report generated successfully",
  report: {
    id: 5,
    title: "Monthly Job Report",
    type: "JOB_POSTINGS",
    summary: {
      totalJobs: 45,
      byStatus: { ACTIVE: 20, ASSIGNED: 15, COMPLETED: 10 },
      byDepartment: { "General Surgery": 10, "Cardiology": 8 },
      totalAssignments: 60,
      totalHours: 480,
      totalPayment: 91200
    },
    totalRecords: 45,
    generatedAt: "2025-10-27T12:00:00Z"
  }
}
```

### 2. Generate Attendance Report (Timesheet)
```javascript
const generateAttendanceReport = async (filters) => {
  const response = await ApiService.post('/reports/attendance', {
    title: "Timesheet Report - October",
    parameters: {
      startDate: "2025-10-01",
      endDate: "2025-10-31",
      userId: filters.userId,  // Optional: specific user
      role: "NURSE"            // Optional: filter by role
    }
  });
  
  return response.report;
};

// Response:
{
  report: {
    id: 8,
    title: "Timesheet Report - October",
    type: "ATTENDANCE",
    summary: {
      totalCheckIns: 150,
      totalWorkHours: 1200,
      totalBreakTime: 75,
      lateArrivals: 8,
      earlyDepartures: 3,
      byUser: { /* breakdown by user */ },
      byDepartment: { /* breakdown by department */ },
      attendanceRate: 95.5
    },
    totalRecords: 150,
    generatedAt: "2025-10-27T14:30:00Z"
  }
}
```

### 3. Generate No-Show Jobs Report
```javascript
const generateNoShowReport = async () => {
  const response = await ApiService.post('/reports/no-show-jobs', {
    title: "No-Show Jobs Report",
    parameters: {
      startDate: "2025-10-01",
      endDate: "2025-10-27"
    }
  });
  
  return response.report;
};

// Response:
{
  report: {
    id: 10,
    title: "No-Show Jobs Report",
    type: "NO_SHOW_JOBS",
    summary: {
      totalNoShows: 5,
      byDepartment: { "Emergency": 2, "Surgery": 3 },
      byRole: { DOCTOR: 3, NURSE: 2 },
      totalExpectedPayment: 15750,
      averageHoursMissed: 8
    },
    totalRecords: 5,
    generatedAt: "2025-10-27T15:00:00Z"
  }
}
```

---

## UI Component Structure

```typescript
interface ReportsScreenProps {
  navigation: NavigationProp<any>;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({ navigation }) => {
  const [selectedReportType, setSelectedReportType] = useState('job-postings');
  const [filters, setFilters] = useState({
    title: '',
    startDate: '',
    endDate: '',
    status: '',
    department: '',
    location: ''
  });
  const [recentReports, setRecentReports] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // ... component logic
  
  return (
    <SafeAreaView>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <TouchableOpacity onPress={() => {/* Open filters */}}>
          <FontAwesomeIcon icon="filter" />
        </TouchableOpacity>
      </View>
      
      {/* Report Type Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity 
          style={[styles.tab, selectedReportType === 'job-postings' && styles.tabActive]}
          onPress={() => setSelectedReportType('job-postings')}>
          <Text>Job Postings</Text>
        </TouchableOpacity>
        {/* More tabs... */}
      </ScrollView>
      
      {/* Generate Report Card */}
      <View style={styles.generateCard}>
        <Text style={styles.generateTitle}>Generate Report</Text>
        
        {/* Title Input */}
        <TextInput 
          placeholder="Report Title"
          value={filters.title}
          onChangeText={(text) => setFilters({...filters, title: text})}
        />
        
        {/* Date Range Picker */}
        <DatePicker onDateSelect={(start, end) => {
          setFilters({...filters, startDate: start, endDate: end});
        }} />
        
        {/* Status Filter */}
        <Picker selectedValue={filters.status} onValueChange={(value) => {
          setFilters({...filters, status: value});
        }}>
          <Picker.Item label="All Status" value="" />
          <Picker.Item label="Active" value="ACTIVE" />
          <Picker.Item label="Completed" value="COMPLETED" />
        </Picker>
        
        {/* Generate Button */}
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={handleGenerateReport}
          disabled={isGenerating}>
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Report</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Recent Reports List */}
      <View style={styles.recentReportsSection}>
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        <FlatList
          data={recentReports}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.reportCard}
              onPress={() => navigation.navigate('ReportDetails', { reportId: item.id })}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>{item.title}</Text>
                <Text style={styles.reportType}>{item.type}</Text>
              </View>
              <Text style={styles.reportDate}>
                {formatDate(item.generatedAt)}
              </Text>
              <View style={styles.reportStats}>
                <Text>Total Records: {item.totalRecords}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
};
```

---

## What Happens Step-by-Step

### Step 1: User Clicks "Reports" Card
- Navigates to Reports Screen
- Loads list of previously generated reports (via `GET /api/v1/reports`)

### Step 2: User Selects Report Type
- User clicks on a tab (Job Postings, Assignments, Attendance, etc.)
- Screen shows relevant filters for that report type

### Step 3: User Enters Filters
- Title: User enters a report name
- Date Range: Select start and end dates
- Additional filters: Status, Department, Location (depending on report type)

### Step 4: User Clicks "Generate Report"
- Calls the appropriate POST endpoint (e.g., `/api/v1/reports/job-postings`)
- Shows loading spinner
- Receives report data with summary and details
- Saves the report to the list
- Displays the report summary immediately

### Step 5: User Views Report
- User can click on the generated report to see full details
- Shows summary statistics (total jobs, by status, by department, etc.)
- Shows detailed data table with all records
- Option to export as CSV/PDF

### Step 6: User Can Export
- Click "Export" button
- Downloads report in selected format (JSON, CSV, PDF, EXCEL)

---

## Summary

**The Reports Screen allows HR/Admin to:**
1. Generate various types of reports (Job Postings, Assignments, Attendance, No-Shows, Financial)
2. Apply filters to get specific data
3. View summary statistics and detailed records
4. Export reports in different formats
5. Track and manage all generated reports

**Key Data Displayed:**
- Summary statistics (totals, breakdowns, averages)
- Detailed records with filters
- Visual charts/graphs (optional)
- Export options
- Report history

This provides HR with comprehensive insights into job management, staff performance, attendance, and financial data.
