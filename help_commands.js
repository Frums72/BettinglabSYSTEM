const { EmbedBuilder } = require("discord.js");

async function helpCommand(i) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📚 BETLAB COMMANDS")
    .setDescription("**Alle verfügbaren Commands für dich!**")
    .addFields(
      {
        name: "💰 COINS & LEVEL",
        value: "`/betlabcoins` - Deine Coins anzeigen\n`/betlabxp` - Deine XP & Level\n`/betlabstats` - Komplette Statistik\n`/betlabranking <type>` - Top 5 Rankings",
        inline: false
      },
      {
        name: "🎰 GAMBLING GAMES",
        value: "`/betlabcoinflip <anzahl>` - Münzwurf\n`/betlabdice <anzahl> <zahl>` - Würfel raten\n`/betlabblackjack <anzahl>` - Blackjack spielen\n`/betlabhighlow <anzahl>` - Zahlen-Streak Game\n`/betlabrace <anzahl>` - Tier-Rennen",
        inline: false
      },
      {
        name: "💎 INVESTMENTS",
        value: "`/betlabinvest <projekt> <anzahl>` - In Projekte investieren\n\n**Projekte:**\n🏪 SHOP (Sicher) - 5-10% Return\n🏭 FABRIK (Mittel) - 12-16% Return\n💎 CASINO (Hoch) - 20-28% Return",
        inline: false
      },
      {
        name: "🎁 DAILY BELOHNUNGEN",
        value: "`/betlabspin` - Daily Spin (gratis!)\n`Siehe #daily-rewards` - Daily Rewards (7-Tage Streak)\n`Siehe #quests` - Daily & Weekly Quests",
        inline: false
      },
      {
        name: "💸 STEUER & JACKPOT",
        value: "**Jedes Gambling/Investment zahlt 1% Steuer!**\nDafür nimmst du automatisch am **Weekly Jackpot** teil!\n\n📍 Siehe <#1505213996276645980> für aktuellen Stand\n🎰 Auslosung: Jeden Montag 08:00 Uhr",
        inline: false
      }
    )
    .setThumbnail("https://s1.directupload.eu/images/260424/twd9ydz3.jpg")
    .setFooter({ text: "BetLab - Dein Gamification Bot" })
    .setTimestamp();
  
  return i.reply({ embeds: [embed], flags: 64 });
}

async function teamhelpCommand(i) {
  // Team Check
  if (!i.member.roles.cache.has("963870711678640188")) {
    return i.reply({ content: "❌ Keine Berechtigung.", flags: 64 });
  }
  
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle("🛠️ TEAM COMMANDS")
    .setDescription("**Alle Admin/Team Commands**")
    .addFields(
      {
        name: "⚙️ USER MANAGEMENT",
        value: "`/betlabeditcoins <user> <anzahl>` - Coins setzen\n`/betlabeditxp <user> <xp>` - Total XP setzen",
        inline: false
      },
      {
        name: "💰 INVESTMENT MANAGEMENT",
        value: "`/investreset <projekt>` - Projekt zurücksetzen\n\n**Projekte:**\n`shop` - Shop reset\n`fabrik` - Fabrik reset\n`casino` - Casino reset\n`all` - Alle zurücksetzen",
        inline: false
      },
      {
        name: "🎁 GIVEAWAYS",
        value: "`/giveaway <channel> <gewinn> [dauer]` - Giveaway starten\n\n**Beispiele:**\n`/giveaway #giveaways 500 Coins 60`\n`/giveaway #giveaways Nitro 120`",
        inline: false
      },
      {
        name: "📊 SYSTEMS",
        value: "**Automatische Systeme:**\n• Daily Leaderboard (08:00 UTC)\n• Weekly Jackpot (Montag 08:00 UTC)\n• Quest Reset (täglich/wöchentlich)\n• Investment Payouts (alle 10min)\n• Erinnerungen (alle 30min)",
        inline: false
      }
    )
    .setThumbnail("https://s1.directupload.eu/images/260424/twd9ydz3.jpg")
    .setFooter({ text: "Team Only" })
    .setTimestamp();
  
  return i.reply({ embeds: [embed], flags: 64 });
}

module.exports = { helpCommand, teamhelpCommand };
