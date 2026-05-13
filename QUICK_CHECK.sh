#!/bin/bash
echo "🔍 BOT SETUP CHECK"
echo "=================="
echo ""

# Check 1: Node.js
echo "✓ Node Version:"
node --version
echo ""

# Check 2: Dependencies
if [ -d "node_modules" ]; then
  COUNT=$(ls node_modules/ | wc -l)
  echo "✓ Dependencies: $COUNT packages installed"
else
  echo "❌ Dependencies: node_modules nicht gefunden! Führe 'npm install' aus"
fi
echo ""

# Check 3: .env
if [ -f ".env" ]; then
  echo "✓ .env Datei gefunden"
  if grep -q "TOKEN=" .env && grep -q "CLIENT_ID=" .env; then
    echo "  ✓ TOKEN und CLIENT_ID vorhanden"
  else
    echo "  ❌ TOKEN oder CLIENT_ID fehlt!"
  fi
else
  echo "❌ .env Datei nicht gefunden!"
fi
echo ""

# Check 4: Wichtige Dateien
echo "✓ Bot Dateien:"
for file in index.js levels.js moderation.js tickets.js invites.js; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ❌ $file FEHLT!"
  fi
done
echo ""

# Check 5: restoreTickets Function
echo "✓ Prüfe tickets.js exports:"
if grep -q "module.exports.*restoreTickets" tickets.js; then
  echo "  ✓ restoreTickets wird exportiert"
else
  echo "  ❌ restoreTickets FEHLT im Export!"
fi
echo ""

echo "=================="
echo "Wenn alles ✓ ist, kannst du starten mit: node index.js"
