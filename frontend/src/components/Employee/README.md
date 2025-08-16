# EmployeeDetailModal Component

A comprehensive modal component for displaying detailed employee information with a tab-based interface.

## Features

### Overview Tab
- Employee basic information (name, position, department, role)
- Contact information (email, phone, address) 
- Employment details (hire date, birth date, status)
- Professional gradient header with avatar
- Role-based badge styling

### Schedule Tab
- Week/Month view toggle
- Current period navigation (previous/next)
- Employee schedule display for selected time period
- Color-coded shift types (morning, afternoon, evening, night)
- Empty state when no schedules found

### Abilities Tab
- 5 default abilities with progress bars
- Visual rank badge (S=gold, A=silver, B=bronze, C=green, D=gray)
- Total score calculation and display
- Editable abilities (admin/manager only)
- Real-time progress bar updates during editing
- Save/Cancel functionality

### Notes Tab
- Three note types with icons:
  - General (blue, comment icon)
  - Praise (green, thumbs-up icon)
  - Caution (yellow, warning icon)
- Add new notes with type selection
- Private note option
- Delete own notes functionality
- Author and timestamp display
- Rich note content display

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| employeeId | string/number | Yes | ID of employee to display |
| isOpen | boolean | Yes | Controls modal visibility |
| onClose | function | Yes | Callback when modal is closed |

## Usage

### Basic Usage

```jsx
import EmployeeDetailModal from './components/Employee/EmployeeDetailModal';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const handleOpenModal = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployeeId(null);
  };

  return (
    <div>
      <button onClick={() => handleOpenModal(123)}>
        View Employee Details
      </button>
      
      <EmployeeDetailModal
        employeeId={selectedEmployeeId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
```

### Integration with EmployeeList

```jsx
// Add these states to your EmployeeList component
const [showDetailModal, setShowDetailModal] = useState(false);
const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState(null);

// Add handler
const handleViewDetails = (employee) => {
  setSelectedEmployeeForDetail(employee);
  setShowDetailModal(true);
  setShowActionSheet(false); // Close action sheet if open
};

// In action sheet, add button
<button 
  className="action-item"
  onClick={() => handleViewDetails(selectedEmployee)}
>
  <i className="fas fa-user"></i>
  <span>{t('employee.viewDetails')}</span>
</button>

// Add modal at end of component
<EmployeeDetailModal
  employeeId={selectedEmployeeForDetail?.id}
  isOpen={showDetailModal}
  onClose={() => {
    setShowDetailModal(false);
    setSelectedEmployeeForDetail(null);
  }}
/>
```

## API Endpoints Required

The component expects these API endpoints to be available:

```javascript
// Employee basic info
GET /api/employees/:id

// Employee abilities
GET /api/employees/:id/abilities
PUT /api/employees/:id/abilities

// Employee notes
GET /api/employees/:id/notes
POST /api/employees/:id/notes

// Employee schedules
GET /api/employees/:id/schedules?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD

// Notes management
DELETE /api/notes/:noteId
```

### Expected Data Formats

#### Employee Data
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "address": "123 Main St",
  "position": "Developer",
  "department": "IT",
  "hireDate": "2023-01-15",
  "birthDate": "1990-05-20",
  "status": "active",
  "user": {
    "role": "employee"
  }
}
```

#### Abilities Data
```json
{
  "abilities": [
    {
      "name": "Communication",
      "level": 75,
      "category": "soft"
    },
    {
      "name": "Technical Skills", 
      "level": 85,
      "category": "technical"
    }
  ]
}
```

#### Notes Data
```json
[
  {
    "id": 1,
    "type": "general",
    "content": "Excellent team player",
    "isPrivate": false,
    "createdAt": "2023-12-01T10:30:00Z",
    "authorId": 2,
    "author": {
      "name": "Manager Name"
    }
  }
]
```

#### Schedules Data
```json
[
  {
    "id": 1,
    "date": "2023-12-01",
    "startTime": "09:00",
    "endTime": "17:00",
    "shiftType": "morning"
  }
]
```

## Styling

The component uses CSS classes that match the existing design system:

- Modal backdrop and animations
- Tab navigation styling
- Progress bars and rank badges
- Note type color coding
- Responsive design for mobile devices

## Permissions

- **View Details**: All users can view employee details
- **Edit Abilities**: Only admin and manager roles
- **Add Notes**: All users can add notes
- **Delete Notes**: Users can delete their own notes, admin/manager can delete any

## Responsive Design

- Mobile-first responsive design
- Collapsible tabs on small screens
- Touch-friendly interactions
- Optimized for both portrait and landscape

## Dependencies

- React Hooks (useState, useEffect)
- useLanguage hook for translations
- useAuth hook for user permissions
- API service functions

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- CSS Grid and Flexbox support required