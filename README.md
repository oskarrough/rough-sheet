You know the type of (usually mobile) UI panels you quickly swipe/drag open? 

For example, 
  iOS calls it [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets#iOS-iPadOS)
  Material design has [Bottom](https://m3.material.io/components/bottom-sheets/overview) and Side [Sheets](https://m3.material.io/components/side-sheets/overview).

> This reminds me that I should rename this component to `<rough-sheet>`, no pun intended. Anyway…

To get that sort of behaviour on the web is unfortunately not trivial. [Vaul by Emil Kowalski](https://emilkowal.ski/ui/building-a-drawer-component) is one (good) attempt, but it's React only and thousands and thousands lines of code — because it handles all sorts of edge cases in different browsers, mobile environment with keyboards on top and so on. You can imagine the amount of edge cases to deal with.

This is a more naive approach. A web component (custom element) you can drop into any page. Or copy/paste the code and adapt to your needs.
