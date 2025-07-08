Our foundation is built on a system of design tokens. All styling MUST use these tokens to ensure consistency.

Theme: "CourseForge Light"
This theme is designed to feel open, focused, and encouraging.

Colors: A palette of soft, accessible colors that create a calm and professional learning environment.

background: #F8F9FA (A very light, clean off-white)

foreground: #1A202C (A dark, soft charcoal for primary text)

sidebar-background: #111827 (A deep, dark gray for the main navigation sidebar to create contrast)

card: #FFFFFF (Pure white for content cards to make them pop)

primary: #8B5CF6 (A vibrant but soft violet for interactive elements, buttons, and active states)

primary-foreground: #FFFFFF (Text used on top of the primary color)

primary-light: #F5F3FF (A very light lavender for card backgrounds or highlights, like the "Pharmacology" card in your inspiration)

accent-green: #10B981 (A friendly, muted green for success states, "Completed" badges, or task-related items)

accent-green-light: #ECFDF5 (A very light green for backgrounds)

muted-foreground: #6B7280 (A medium gray for descriptive text, placeholders, and subtitles)

border: #E5E7EB (A subtle, light gray for borders and separators)

Borders:

--radius: 0.75rem (12px) for the highly rounded corners on cards and containers.

--radius-sm: 0.5rem (8px) for smaller elements like buttons and badges.

Shadows: We'll use soft, layered shadows to create depth.

shadow-md: A subtle shadow for default cards. 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)

shadow-lg: A more pronounced shadow for highlighted or hovered elements. 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)

Typography: A clean, sans-serif font like Inter will work perfectly.

3. Animation & Motion
Motion provides feedback, directs attention, and adds character. All animations should be purposeful and consistent.

Timings (Duration):

Quick: 150ms (For state changes like hover effects on buttons or links).

Standard: 300ms (For UI elements appearing/disappearing, like modals or accordions expanding).

Deliberate: 500ms (For larger panel transitions or more significant layout shifts).

Easing: We'll primarily use an ease-in-out timing function to make motion feel natural and smooth.

Transitions: We will use CSS transitions on transform, opacity, and background-color for performance.

Key Animations:


Loading Skeletons: Use a shimmering wave animation on skeleton loaders that mimic the layout they are loading into (e.g., a two-column skeleton for the learning interface). 


Page Transitions: When navigating between major sections, the incoming content should fade and slide in subtly from the bottom or side, making the transition feel less jarring. 

Card Highlight: On hover or when active, cards should scale up slightly (scale: 1.02) and gain a more pronounced shadow (shadow-lg). This applies directly to the LearningGraph organism.

4. Component Hierarchy
(No changes to the component definitions, but they will now be built using our new theme)

4.1. Atoms
Button, Card, Badge, Input, Label, Avatar, Separator, Skeleton.

4.2. Molecules
CourseStat, CurriculumItem, UserInfo.

4.3. Organisms
CourseHero, StudentDashboardHeader, LearningGraph, UpcomingEvents.


Sources
