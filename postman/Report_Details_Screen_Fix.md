# Report Details Screen Fix

## Issue
The `ReportDetailsScreen` is using mock data instead of fetching real report details from the API.

## Fixes Needed

### 1. Update `ReportDetailsScreen.tsx`

Replace the mock data loading with real API call:

```typescript
const loadReportDetails = async () => {
  try {
    setLoading(true);
    
    // Fetch report details from API
    const reportData = await ApiService.getReportDetails(reportId);
    setReport(reportData.report);
    
  } catch (error) {
    console.error('Failed to load report details:', error);
    Alert.alert('Error', 'Failed to load report details');
  } finally {
    setLoading(false);
  }
};
```

### 2. Add `jobId` parameter to Reports API calls

In your `ReportsScreen.tsx`, add a new input field for `jobId`:

```typescript
const [filters, setFilters] = useState<ReportFilters>({
  title: '',
  startDate: '',
  endDate: '',
  status: '',
  department: '',
  location: '',
  jobId: '', // Add this
});

// In the generate report handler, include jobId
let requestData = {
  title: filters.title,
  parameters: {
    ...(filters.jobId && { jobId: parseInt(filters.jobId) }), // Add jobId parameter
    startDate: filters.startDate,
    endDate: filters.endDate,
    ...(filters.status && { status: filters.status }),
    ...(filters.department && { department: filters.department }),
    ...(filters.location && { location: filters.location }),
  },
  fileFormat: 'JSON',
};
```

### 3. Add jobId input field in ReportsScreen UI

Add this after the location filter:

```typescript
{/* Job ID Filter */}
<View style={styles.inputContainer}>
  <Text style={styles.inputLabel}>Job ID (Optional)</Text>
  <TextInput
    style={styles.textInput}
    placeholder="Enter specific job ID"
    value={filters.jobId}
    onChangeText={(text) =>
      setFilters({ ...filters, jobId: text })
    }
    keyboardType="numeric"
  />
</View>
```

### 4. Update ReportsScreen filter interface

```typescript
interface ReportFilters {
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  department: string;
  location: string;
  jobId?: string; // Add this
  userId?: string;
}
```

## Complete Updated Code Sections

### Update loadReportDetails in ReportDetailsScreen.tsx

**Replace lines 42-64:**

```typescript
const loadReportDetails = async () => {
  try {
    setLoading(true);
    
    // Fetch real report details from API
    const reportData = await ApiService.getReportDetails(reportId);
    
    // The API returns { report: {...} }
    if (reportData && reportData.report) {
      setReport(reportData.report);
    } else {
      throw new Error('Invalid report data');
    }
    
  } catch (error: any) {
    console.error('Failed to load report details:', error);
    Alert.alert('Error', error.message || 'Failed to load report details');
  } finally {
    setLoading(false);
  }
};
```

### Update ReportsScreen state

**In ReportsScreen.tsx, update the filter interface and state:**

```typescript
interface ReportFilters {
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  department: string;
  location: string;
  jobId?: string;
}

const [filters, setFilters] = useState<ReportFilters>({
  title: '',
  startDate: '',
  endDate: '',
  status: '',
  department: '',
  location: '',
  jobId: '',
});
```

### Add jobId parameter to API calls

**In handleGenerateReport function in ReportsScreen.tsx:**

```typescript
let requestData = {
  title: filters.title,
  parameters: {
    ...(filters.jobId && filters.jobId.trim() && { jobId: parseInt(filters.jobId) }),
    startDate: filters.startDate,
    endDate: filters.endDate,
    ...(filters.status && { status: filters.status }),
    ...(filters.department && { department: filters.department }),
    ...(filters.location && { location: filters.location }),
  },
  fileFormat: 'JSON',
};
```

## Summary of Changes

1. **ReportDetailsScreen**: Replace mock data with real API call using `ApiService.getReportDetails(reportId)`
2. **ReportsScreen**: Add `jobId` field to filters
3. **ReportsScreen**: Add UI input for job ID
4. **ReportsScreen**: Include `jobId` in API request parameters when provided
5. **Backend**: Already supports `jobId` parameter (you already added it)

## Testing

After making these changes, you can:

1. Generate a report for a specific job by entering the job ID (e.g., 16)
2. View the report details by clicking on it in the list
3. See the actual report data from the database instead of mock data
