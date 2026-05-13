# 🔧 HOTFIX für Bot Crash

## Problem:
```
TypeError: restoreTickets is not a function
```

## Ursache:
In `tickets.js` heißt die Funktion `restoreTicketsOnStartup`, aber `index.js` ruft `restoreTickets` auf.

## Lösung (2 Optionen):

### Option 1: tickets.js umbenennen (EMPFOHLEN)
Öffne `tickets.js` und ändere Zeile 309 von:
```javascript
module.exports = { sendPanel, handleInteraction, restoreTicketsOnStartup };
```
zu:
```javascript
module.exports = { sendPanel, handleInteraction, restoreTickets };
```

Und ändere die Funktionsdefinition (Zeile ~18) von:
```javascript
async function restoreTicketsOnStartup(guild, client) {
```
zu:
```javascript
async function restoreTickets(guild, client) {
```

### Option 2: index.js ändern
Öffne `index.js` und ändere Zeile 9 von:
```javascript
const { handleInteraction: handleTicketInteraction, restoreTickets } = require("./tickets");
```
zu:
```javascript
const { handleInteraction: handleTicketInteraction, restoreTickets: restoreTicketsOnStartup } = require("./tickets");
```

Und Zeile 67 von:
```javascript
await restoreTickets(guild, client);
```
zu:
```javascript
await restoreTicketsOnStartup(guild, client);
```

## Schnellste Lösung:
1. Stoppe den Bot
2. Öffne `tickets.js`
3. Suche nach `restoreTicketsOnStartup` (2x vorkommend)
4. Ersetze mit `restoreTickets`
5. Speichern & Bot neustarten

Fertig! ✅
