# Product Guidelines

## Tone of Voice
- **Calm & Supportive**: The language should be reassuring and stress-reducing, avoiding urgent or alarming phrasing. The goal is to make time tracking feel like a helpful aid, not a surveillance tool.
- **Direct & Concise**: Communicate clearly and simply. Avoid technical jargon or excessive wordiness. Instructions and labels should be instantly understandable.

## Visual Identity
- **High Contrast**: Employ a color palette that maximizes readability and clearly distinguishes between different UI components. Ensure sufficient contrast ratios for text against backgrounds to meet accessibility standards.
- **Iconography**: Use Lucide React icons consistent with text labels to provide dual coding (visual and semantic) for easier recognition and navigation.
- **Spacious Layout**: Prioritize generous padding and whitespace. Avoid clutter to reduce cognitive load and help users focus on the task at hand.

## User Interaction
- **Immediate Feedback**: The interface must acknowledge every user action instantly. Whether it's a subtle visual state change on a button press or a toast notification for a successful save, the user should never be left guessing.
- **Contextual Actions**: Prefer inline editing or dedicated views over frequent modal interruptions. Modals should be reserved for critical confirmations or short, self-contained tasks.

## Error Handling & Empty States
- **Constructive Error Messages**: When things go wrong, the application should explain *what* happened and *how* to fix it in plain language. Avoid blaming the user (e.g., use "File could not be saved" instead of "You made an error").
- **Helpful Empty States**: Never leave a blank screen. Empty lists or dashboards should feature encouraging illustrations and clear calls to action (e.g., "Create your first project") to guide the user.
- **Inline Validation**: Form validation should occur in real-time or on blur, displaying clear error messages and visual indicators (like red borders) directly next to the problematic field to facilitate quick correction.
