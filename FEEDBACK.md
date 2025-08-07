# User Feedback

## Sage's Thoughts

### UI/UX Improvements
- [x] Make thumbnails a bit bigger
- [x] More helpful display for plant cards: show last watering instead of health
- [x] Add thumbnail to plant details page
- [x] Compress date and time in add events page (show date and "X days ago")
- [x] Sticky headers for the name of the room that you're in

### Event Management
- [x] Separate care actions vs general events
- [x] Add new event types: new leaf, relocation, roots spotted
- Create fertilizer concentration buttons (1/4, 1/2, 1x, 1.5x, and 2x strengths)

### Photo Management
- Remove badges from photos
- Add delete button with multiselect capability

### Features
- Add metrics (e.g., water frequency)
- Add ability to sort plants in the plants page

## Mya's Thoughts

### Optimization
- Need to add caching and similar items so that the item is not doing so many reads
- Upon adding a photo, add a full size version and a smaller version for the thumbnails to decrease the amount of megabytes being read on every load of the plants page and quick events page.

### Event System Enhancements
- Attach photos to events (connect photos to specific events)
- Add tabs at the top to separate event categories:
  - **Care Tab**: water, fertilize, fertigate, repot, prune, insecticide
  - **Events Tab**: pest spotted, new leaf, relocation, roots spotted

### UX Improvements
- When keyboard opens, snap the input field above the keyboard
- Add ability to download photos
- Add ability to search via a search bar in plants list
- [x] Add ability to zoom into full screen photos