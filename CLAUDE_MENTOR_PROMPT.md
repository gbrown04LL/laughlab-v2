# Claude Code Prompt: Implement Mentor Feedback Section

## Objective
Implement the "Mentor Feedback Section" on the Report Dashboard (`/report`) to translate raw analysis data into actionable, conversational advice, serving as the core value proposition for the premium tier.

## Technical Requirements

1.  **Component Creation**: Create a new component, `src/components/report/MentorFeedbackCard.tsx`.
2.  **Integration**: Integrate this component into `src/components/report/Page1Dashboard.tsx` immediately below the main metrics snapshot.
3.  **Data Source**: The component must accept the full `analysis` object as a prop. The content for the three sections will be sourced from the `analysis.feedback` object (which must be assumed to exist and contain the required fields).

## UI/UX Requirements

1.  **Structure**: The component must be a single, large card containing three distinct, clearly separated sections.
2.  **Styling**: Use Tailwind CSS to match the existing dark theme.
3.  **Content Length**: The total text length across all three sections should be approximately 450-500 words.
4.  **Tone**: The tone must be conversational, professional, and act as a "comedy writing mentor."

## Content Structure & Styling

The card must display the following three sections, each with a distinct icon and color accent:

| Section | Title | Icon | Color Accent | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **What's Working Well** | `✨ What's Working Well` | Sparkles (`✨`) | **Green** (e.g., `text-green-400`, `bg-green-900/20`) | Highlights successful techniques and high-scoring areas. |
| **Areas for Improvement** | `🔧 Areas for Improvement` | Wrench (`🔧`) | **Yellow/Orange** (e.g., `text-yellow-400`, `bg-yellow-900/20`) | Identifies critical gaps, low-scoring areas, and attention drop risks. |
| **Next Steps** | `🎯 Next Steps` | Target (`🎯`) | **Blue** (e.g., `text-blue-400`, `bg-blue-900/20`) | Provides concrete, actionable strategies for revision and directs the user to the next analysis module. |

## Data Contract Assumption

Assume the `analysis` object contains the following structure for the feedback content:

```typescript
interface Analysis {
  // ... other fields
  feedback: {
    workingWell: string; // Content for the Green section (approx. 150 words)
    areasForImprovement: string; // Content for the Yellow section (approx. 200 words)
    nextSteps: string; // Content for the Blue section (approx. 100 words)
  };
  // ...
}
```

## Acceptance Criteria

1.  The `MentorFeedbackCard` component renders correctly on the dashboard.
2.  The three sections are clearly delineated with the specified icons and color accents.
3.  The component is fully integrated into `Page1Dashboard.tsx`.
4.  The content is pulled dynamically from the `analysis.feedback` prop.
5.  The component is styled to look like a high-value, premium feature.

## Example Implementation Guidance

*   Use `div` elements with border or background colors to create the distinct sections.
*   Ensure proper padding and margin to prevent the text from looking cramped.
*   The final paragraph of the entire card should end with a clear call to action, such as: "Ready to dive into the Punch-Up Workshop?" (This will be the transition to the next analysis stage).
*   **Do not** implement the actual LLM generation logic; only implement the UI component and assume the data is present in the prop.
*   **Do not** implement the "Upgrade" button logic; focus purely on the display of the premium content.
