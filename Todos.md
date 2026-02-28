Empfohlener 2.0-Pfad

Starte mit /bmad-bmm-correct-course (CC): definiert offiziell den Pivot auf „Core + CLI zuerst, UI später“.
Danach /bmad-bmm-create-prd (CP): PRD v2 mit klarem Scope.
Dann /bmad-bmm-create-architecture (CA): Zielarchitektur als Layer-Modell festziehen.
Danach /bmad-bmm-create-epics-and-stories (CE): nur Epics/Stories für Core + CLI erzeugen.
Anschließend /bmad-bmm-sprint-planning (SP): Sprintplan neu auf v2 ausrichten.
Was in PRD/Architektur v2 explizit rein sollte

MVP: Core-Service + CLI Interface; UI explizit out of scope.
Architektur: Core (Domain/Application) + Adapter-Layer (CLI jetzt, Electron später).
Unix-CLI-Prinzipien: stdin/stdout, stabile Exit-Codes, skriptbar, deterministische Ausgabe.
„Interface-Parität“ als Regel: CLI und spätere UI sprechen denselben Core über Ports/Use-Cases.
Praktischer Tipp für deinen aktuellen Stand

Behalte bestehende Artefakte als v1-Referenz und führe alle neuen Entscheidungen als v2 (damit nichts verloren geht).
In der Implementierungsphase dann pro Story: CS → VS → DS → CR.
Wenn du willst, formuliere ich dir direkt eine kurze CC-Eingabe (Copy/Paste), die genau deinen Pivot beschreibt.
