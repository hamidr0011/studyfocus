# StudyFocus

StudyFocus is an advanced, client-side productivity and time-management application designed specifically for university students. It combines task organization, session tracking, and graphical analytics into a unified local-first architecture. 

The entire interface and user flow have been engineered strictly around core **Human-Computer Interaction (HCI)** principles, ensuring a seamless, accessible, and cognitive-friendly experience.

## Core Features

- **Categorized Dashboard:** Organizes tasks intuitively by priority and completion status.
- **Customizable Subjects:** Color-coded structural lists with dedicated note-taking areas.
- **Focus Timer:** Integrated session tracking that automatically feeds raw data into the analytics engine.
- **Analytics Engine:** Visualizes focus trends over a 7-day rolling window to encourage consistency.
- **Universal Search (Cmd+K / Ctrl+K):** Instantly filter and locate tasks across the entire application without breaking navigational workflow.
- **Advanced Gestures & Direct Manipulation:** Reorder tasks via Drag-and-Drop and utilize mobile-friendly swipe-to-delete interactions.
- **Contextual Interfaces:** Minimized UI clutter through the use of contextual menus (Right-Click/Long-Press).
- **Adaptive Theming:** Intelligent Dark Mode and user-customizable global accent colors.
- **Local-First Privacy:** 100% of data is stored securely in the local browser cache (`localStorage`).

---

## Applied HCI Principles & UX Rationale

The development of StudyFocus prioritized human cognitive models to minimize processing friction and maximize usability.

### 1. Minimalist & Aesthetic Design (Nielsen’s Heuristics)
The application aggressively reduces visual noise. By offloading secondary actions (like editing or deleting subjects) into **Contextual Menus**, the primary interface remains focused solely on the user's data. This significantly reduces the cognitive burden of scanning a cluttered screen.

### 2. Direct Manipulation & Physical Metaphors
Users interact with tasks through **Drag-and-Drop** reordering and **Swipe-to-Delete** gestures. These actions map software interactions directly to physical world expectations, making the interface feel tactile and significantly reducing the learning curve for new users.

### 3. Error Prevention & Recovery
Destructive actions are heavily mitigated through systemic forgiveness:
- **Undo Functionality:** Deleting a task immediately provides a temporary "Undo" toast notification, adhering strongly to the principle of "User Control and Freedom."
- **Confirmation Modals:** Irreversible actions, such as deleting an entire subject (and its cascading task list), require explicit confirmation to proceed.

### 4. Visibility of System Status
The system constantly communicates its current behavioral state back to the user:
- **Haptic & Audio Feedback:** Micro-interactions (like toggling a task or starting a timer) are accompanied by subtle synthesized feedback, providing physical confirmation of a successful DOM update.
- **Toast Notifications:** Ephemeral messages confirm background data saves without interrupting flow.
- **Dynamic Data Binding:** The dashboard and analytics chart instantly re-render without page refreshes when new telemetry is logged.

### 5. Fitts’s Law Execution
Interactive elements are sized and positioned mathematically to minimize the time required to track to them. Primary actions (like the oversized "Start" and "Stop" timer buttons) possess massive, easily clickable tap-targets, while secondary actions are grouped logically into nested menus to prevent accidental misclicks.

### 6. Universal Search (Hick’s Law Mitigation)
To prevent users from being overwhelmed by navigating through dozens of nested subject lists (Hick's Law), the **Universal Search (Cmd+K / Ctrl+K)** paradigm allows users to instantly bypass complex navigational hierarchies. They can query exactly what they need from any viewpoint in the app.

### 7. Accessibility (WCAG Compliance)
The application’s color typography is strictly bounded by universal accessibility thresholds:
- Muted text colors maintain a strict **4.5:1 contrast ratio**, guaranteeing legibility for users with visual impairments.
- The Dark Mode inverses text weight and modifies foreground elevations to eliminate visual astigmatism (anti-halation), ensuring fine text remains sharp against dark digital materials.

---

## Installation & Usage

StudyFocus requires no build pipelines, complex web frameworks, or backend SQL servers. It runs completely offline in any modern HTML5/CSS3 web browser.

1. Clone or download this repository.
2. Open `studyfocus.html` in your web browser (Chrome, Edge, Safari, Firefox).
3. All tasks, times, and thematic preferences will automatically save to your machine's persistent `localStorage`.
