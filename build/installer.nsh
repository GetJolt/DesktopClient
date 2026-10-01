; Branded welcome and finish pages for the assisted (non one-click) installer.

!macro customHeader
  !define MUI_WELCOMEPAGE_TITLE "Welcome to Jolt"
  !define MUI_WELCOMEPAGE_TEXT "Jolt is open-source chat for communities, on servers you can trust.$\r$\n$\r$\nUse the main instance or one you host yourself. A single account works across every Jolt instance.$\r$\n$\r$\nClick Next to continue."
  !define MUI_FINISHPAGE_TITLE "Jolt is ready"
  !define MUI_FINISHPAGE_TEXT "Jolt has been installed. It keeps itself up to date in the background."
!macroend

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend
