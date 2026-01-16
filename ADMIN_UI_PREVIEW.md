# Admin UI Preview

## Modal Styling

### Add Trick Modal
```
┌─────────────────────────────────────────┐
│ Add New Trick                       [×]  │
├─────────────────────────────────────────┤
│                                         │
│  Trick Name *                           │
│  [________________________]              │
│                                         │
│  Level                                  │
│  [▼ Advanced ________________]           │
│                                         │
│  Description                            │
│  [_____________________________]         │
│  [_____________________________]         │
│                                         │
│  Tips                                   │
│  [_____________________________]         │
│  [_____________________________]         │
│                                         │
│  Difficulty Score (0-10)                │
│  [__________]                           │
│                                         │
├─────────────────────────────────────────┤
│                    [Cancel] [Add Trick]  │
└─────────────────────────────────────────┘
```

### Edit Tricks Modal
```
┌─────────────────────────────────────────┐
│ Edit Tricks                         [×]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Kickflip          (Advanced)    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Ollie             (Beginner)    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Double Back Flip   (Elite)      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  (Click on a trick to edit)             │
│                                         │
└─────────────────────────────────────────┘
```

### Delete Tricks Modal
```
┌─────────────────────────────────────────┐
│ Delete Tricks                       [×]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Kickflip          (Advanced)    │   │
│  │              [Delete]           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Ollie             (Beginner)    │   │
│  │              [Delete]           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  (Red themed for destructive action)    │
│                                         │
└─────────────────────────────────────────┘
```

## Header Buttons

When logged in as owner, you'll see 5 admin buttons in the header:

```
[+ Add Trick] [Edit Tricks] [Delete Tricks] [Import] [Export]
     (Blue)     (Orange)       (Red)       (Green) (Purple)
```

## Color Scheme

```
Primary Blue    #3b82f6  - Add & Save actions
Hover Blue      #2563eb  - Interactive states
Orange          #f59e0b  - Edit & Modify
Red             #ef4444  - Delete & Danger
Green           #10b981  - Import & Success
Purple          #8b5cf6  - Export & Info
Secondary Gray  #e0e0e0  - Cancel & Neutral
```

## Animations

- Modal appears with smooth "slideUp" animation (300ms)
- Fade in backdrop blur effect
- Button hover transitions (200ms)
- Smooth color transitions on hover

## Responsive Design

- Modal max-width: 600px
- Adapts to 90% width on small screens
- Mobile-friendly form inputs
- Touch-friendly button sizes (min 44px tall)
- Scrollable on small viewports

## Form Validation

- Required fields marked with *
- Inline validation feedback
- Number inputs for difficulty score (0-10)
- Text area for longer descriptions
- Select dropdowns for fixed options

## Status Feedback

### Success Messages
```
✓ Trick "Kickflip" added successfully!
✓ Trick updated successfully!
✓ Trick deleted successfully!
✓ Successfully imported 5 trick(s)!
✓ Export complete!
```

### Error Messages
```
Error connecting to API. Make sure admin server is running on port 3001
Error: Failed to add trick
Error loading tricks
Invalid format: JSON must be an array of tricks
Unauthorized: Only owner can access admin features
```

## Accessibility Features

- Semantic HTML structure
- ARIA-compatible modals
- Keyboard accessible (Tab navigation)
- Clear visual feedback
- High contrast text
- Descriptive button labels
- Error messages clearly marked

## Performance

- No external dependencies (vanilla JS)
- Lightweight CSS (~2KB)
- Async/await for non-blocking operations
- Efficient DOM manipulation
- Minimal re-renders
