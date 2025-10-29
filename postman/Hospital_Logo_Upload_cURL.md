# Hospital Logo Upload - cURL Examples

## Upload Logo During Hospital Creation (ADMIN)

```bash
curl -X POST "{{baseUrl}}/api/v1/admin/hospitals" \
  -H "Authorization: Bearer {{token}}" \
  -F "name=City General Hospital" \
  -F "code=CGH001" \
  -F "address[street]=123 Main St" \
  -F "address[city]=City" \
  -F "address[state]=State" \
  -F "address[zipCode]=12345" \
  -F "address[country]=Country" \
  -F "phone=+1234567890" \
  -F "email=contact@hospital.com" \
  -F "logo=@/path/to/logo.png"
```

## Upload Logo to Existing Hospital (ADMIN)

```bash
curl -X POST "{{baseUrl}}/api/v1/admin/hospitals/{{hospitalId}}/logo" \
  -H "Authorization: Bearer {{token}}" \
  -F "logo=@/path/to/logo.png"
```

## Delete Hospital Logo (ADMIN)

```bash
curl -X DELETE "{{baseUrl}}/api/v1/admin/hospitals/{{hospitalId}}/logo" \
  -H "Authorization: Bearer {{token}}"
```

## Get Hospital Logo Image (Public - No Auth)

```bash
# If hospital.logo = "/uploads/hospitals/hospital-1234567890-1234.png"
curl -X GET "{{baseUrl}}/uploads/hospitals/hospital-1234567890-1234.png"
```

## Get Hospital Details (includes logo path)

```bash
# Public endpoint
curl -X GET "{{baseUrl}}/api/v1/public/hospitals" \
  -H "Authorization: Bearer {{token}}"  # Optional

# Admin endpoint
curl -X GET "{{baseUrl}}/api/v1/admin/hospitals/{{hospitalId}}" \
  -H "Authorization: Bearer {{token}}"
```

## Notes

- **File field name**: Must be `logo` (form-data)
- **Supported formats**: jpeg, jpg, png, gif, webp, svg
- **Max file size**: 5MB
- **Response includes**:
  - `logo`: Relative path (e.g., `/uploads/hospitals/hospital-1234567890-1234.png`)
  - `logoUrl`: Full URL (e.g., `http://localhost:3000/uploads/hospitals/hospital-1234567890-1234.png`)
- **Old logo**: Automatically deleted when uploading new one
- **Logo retrieval**: Use the `logo` path from hospital data and prepend your base URL

## Frontend Integration Example

```javascript
// Upload logo
const formData = new FormData();
formData.append('logo', fileInput.files[0]);

fetch(`${baseUrl}/api/v1/admin/hospitals/${hospitalId}/logo`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// Display logo
<img src={`${baseUrl}${hospital.logo}`} alt={hospital.name} />
```

