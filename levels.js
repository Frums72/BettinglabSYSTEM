const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");
const { trackProgress } = require("./quests");

const COLOR = 0xE67E22;
const IMAGE = "https://s1.directupload.eu/images/260424/twd9ydz3.jpg";

const XP_PER_MESSAGE = 15;
const XP_PER_REACTION = 15;
const MSG_CD = 60000;
const REACTION_CD = 300000;
const COINFLIP_XP_CD = 60000;
const MAX_CF_XP = 25;

const LEVELUP_CH = "1504133135468728533";

const LEVEL_ROLES = {
  1:"1504125201074487396",2:"1504131694301544528",3:"1504131724802527443",4:"1504132011227349102",
  5:"1504126007559585823",10:"1504126112136167705",15:"1504126199092215999",20:"1504126254822195211",
  25:"1504126314183921896",30:"1504126377442545704",35:"1504126440306638930",40:"1504126510737658069",
  45:"1504126572645322912",50:"1504126622167601152",55:"1504126685161722049",60:"1504126752677560471",
  65:"1504126832210088126",70:"1504126884827496548",75:"1504126937969328138",80:"1504130945731657829",
  85:"1504130989457149979",90:"1504131013247242424",95:"1504131034894045305",100:"1504131068641677494"
};

const msgCd = new Map();
const reactCd = new Map();
const cfXpCd = new Map();

function getCoinReward(l) {
  if(l===100)return 10;
  if(l===75||l===50||l===25)return 5;
  if(l%5===0)return 2;
  return 1;
}

function getXpForLevel(l) {
  if(l<=10)return 100;
  if(l<=25)return 150;
  if(l<=50)return 200;
  if(l<=75)return 300;
  return 500;
}

function getLevelFromTotalXp(tx) {
  let l=0,n=0;
  while(l<100&&tx>=n+getXpForLevel(l+1)){n+=getXpForLevel(l+1);l++;}
  return{level:l,currentXp:tx-n};
}

async function getUser(uid) {
  const{data}=await supabase.from("levels").select("*").eq("user_id",uid).single();
  return data||{user_id:uid,xp:0,level:0,coins:0,total_xp:0,xp_boost:0,xp_boost_until:null};
}

async function saveUser(uid,xp,l,c,tx,b=0,bu=null) {
  const { data, error } = await supabase.from("levels").upsert({user_id:uid,xp,level:l,coins:c,total_xp:tx,xp_boost:b,xp_boost_until:bu});
  if(error) {
    console.error("❌ saveUser FEHLER:", error);
    return false;
  }
  return true;
}

function getBoost(d) {
  if(d.xp_boost&&d.xp_boost_until){
    const u=new Date(d.xp_boost_until);
    if(u>new Date())return d.xp_boost;
  }
  return 0;
}

async function handleMessage(msg,client) {
  if(msg.author.bot||!msg.guild)return;
  const uid=msg.author.id,now=Date.now();
  if(msgCd.get(uid)&&now-msgCd.get(uid)<MSG_CD)return;
  msgCd.set(uid,now);
  
  const d=await getUser(uid);
  const oldL=d.level;
  const b=getBoost(d);
  const xpG=Math.floor(XP_PER_MESSAGE*(1+b/100));
  const ntx=d.total_xp+xpG;
  const{level:newL,currentXp:cx}=getLevelFromTotalXp(ntx);
  
  await saveUser(uid,cx,newL,d.coins,ntx,d.xp_boost,d.xp_boost_until);
  await trackProgress(uid,"messages",1);
  await trackProgress(uid,"xp",xpG);
  
  if(newL>oldL){
    const coinsE=getCoinReward(newL);
    await handleLevelUp(msg,client,oldL,newL,d.coins+coinsE,coinsE);
  }
}

async function handleReaction(react,user,client) {
  if(user.bot)return;
  const uid=user.id,now=Date.now();
  if(reactCd.get(uid)&&now-reactCd.get(uid)<REACTION_CD)return;
  reactCd.set(uid,now);
  
  const d=await getUser(uid);
  const oldL=d.level;
  const b=getBoost(d);
  const xpG=Math.floor(XP_PER_REACTION*(1+b/100));
  const ntx=d.total_xp+xpG;
  const{level:newL,currentXp:cx}=getLevelFromTotalXp(ntx);
  
  await saveUser(uid,cx,newL,d.coins,ntx,d.xp_boost,d.xp_boost_until);
  await trackProgress(uid,"reactions",1);
  await trackProgress(uid,"xp",xpG);
  
  if(newL>oldL){
    const coinsE=getCoinReward(newL);
    await handleLevelUpReaction(react,user,client,oldL,newL,d.coins+coinsE,coinsE);
  }
}

async function handleLevelUp(msg,client,oldL,newL,newC,coinsE) {
  const u=msg.author;
  const d=await getUser(u.id);
  await saveUser(u.id,d.xp,newL,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
  
  let bt="";
  if(newL===100)bt="\n🎊 **MAX LEVEL!** 🎊";
  else if(newL===75||newL===50||newL===25)bt="\n🎁 **MILESTONE: +5 COINS!**";
  else if(newL%5===0)bt="\n⭐ **5er Milestone: +2 Coins!**";
  
  const e=new EmbedBuilder().setColor(0xF1C40F).setTitle("🎉 LEVEL UP!")
    .setDescription(`<@${u.id}> ist aufgestiegen!\n\n📊 **Level:** ${oldL} → **${newL}**\n🪙 **Coins:** +${coinsE} (Gesamt: **${newC}**)${bt}\n\nWeiter so! 💪`)
    .setThumbnail(u.displayAvatarURL()).setImage(IMAGE).setTimestamp();
  
  try{
    const ch=client.channels.cache.get(LEVELUP_CH)||await client.channels.fetch(LEVELUP_CH);
    if(ch)await ch.send({embeds:[e]});
  }catch(e){await msg.channel.send({embeds:[e]});}
  
  await updateRoles(msg.member,oldL,newL,client);
  await trackProgress(u.id,"levelups",1);
  log(client,"SUCCESS","Level Up!",`User: ${u.tag}\nLevel: ${oldL} → ${newL}`,u);
}

async function handleLevelUpReaction(react,user,client,oldL,newL,newC,coinsE) {
  const d=await getUser(user.id);
  await saveUser(user.id,d.xp,newL,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
  
  let bt="";
  if(newL===100)bt="\n🎊 **MAX LEVEL!** 🎊";
  else if(newL===75||newL===50||newL===25)bt="\n🎁 **MILESTONE: +5 COINS!**";
  else if(newL%5===0)bt="\n⭐ **5er Milestone: +2 Coins!**";
  
  const e=new EmbedBuilder().setColor(0xF1C40F).setTitle("🎉 LEVEL UP!")
    .setDescription(`<@${user.id}> ist aufgestiegen!\n\n📊 **Level:** ${oldL} → **${newL}**\n🪙 **Coins:** +${coinsE} (Gesamt: **${newC}**)${bt}\n\nWeiter so! 💪`)
    .setThumbnail(user.displayAvatarURL()).setImage(IMAGE).setTimestamp();
  
  try{
    const ch=client.channels.cache.get(LEVELUP_CH)||await client.channels.fetch(LEVELUP_CH);
    if(ch)await ch.send({embeds:[e]});
  }catch(e){}
  
  const m=react.message.guild.members.cache.get(user.id)||await react.message.guild.members.fetch(user.id);
  await updateRoles(m,oldL,newL,client);
  await trackProgress(user.id,"levelups",1);
}

async function updateRoles(member,oldL,newL,client) {
  const oldR=LEVEL_ROLES[oldL];
  const newR=LEVEL_ROLES[newL];
  
  if(oldR&&member.roles.cache.has(oldR)){
    try{await member.roles.remove(oldR);}catch(e){}
  }
  
  if(!newR)return;
  
  try{
    const role=member.guild.roles.cache.get(newR);
    if(!role||member.roles.cache.has(newR))return;
    await member.roles.add(newR);
    await member.send({embeds:[new EmbedBuilder().setColor(0x9B59B6).setTitle("🎁 Neue Rolle!").setDescription(`**Level ${newL}**\n\n**Rolle:** ${role.name}`).setImage(IMAGE)]}).catch(()=>{});
    log(client,"SUCCESS","Level-Rolle",`User: ${member.user.tag}\nLevel: ${newL}\nRolle: ${role.name}`,member.user);
  }catch(e){}
}

async function betlabcoins(i) {
  const t=i.options.getUser("user")||i.user;
  const d=await getUser(t.id);
  const xpN=getXpForLevel(d.level+1);
  const need=xpN-d.xp;
  const prog=Math.floor((d.xp/xpN)*100);
  const b=getBoost(d);
  
  return i.reply({embeds:[new EmbedBuilder().setColor(COLOR).setTitle("🪙 Coins & Level")
    .setDescription(`User: **${t.username}**\n\n💰 **Coins:** ${d.coins}\n📊 **Level:** ${d.level}/100\n✨ **XP:** ${d.xp}/${xpN}\n🎯 **Benötigt:** ${need} XP\n📈 **Progress:** ${prog}%\n\n🏆 **Total XP:** ${d.total_xp}${b>0?`\n⚡ **XP Boost:** +${b}%`:''}`)
    .setThumbnail(t.displayAvatarURL()).setImage(IMAGE)],flags:64});
}

async function betlabxp(i) {
  const t=i.options.getUser("user")||i.user;
  const d=await getUser(t.id);
  const xpN=getXpForLevel(d.level+1);
  const need=xpN-d.xp;
  const prog=Math.floor((d.xp/xpN)*100);
  const bar="█".repeat(Math.floor(prog/5))+"░".repeat(20-Math.floor(prog/5));
  const b=getBoost(d);
  
  return i.reply({embeds:[new EmbedBuilder().setColor(COLOR).setTitle("📊 XP Stats")
    .setDescription(`User: **${t.username}**\n\n**Level:** ${d.level}/100\n\n**XP:** ${d.xp}/${xpN}\n**Benötigt:** ${need} XP\n\n**Progress:**\n${bar} **${prog}%**\n\n🏆 **Total:** ${d.total_xp}\n🪙 **Coins:** ${d.coins}${b>0?`\n⚡ **XP Boost:** +${b}%`:''}`)
    .setThumbnail(t.displayAvatarURL()).setImage(IMAGE)],flags:64});
}

async function betlabcf(i) {
  const amt=i.options.getInteger("anzahl");
  const d=await getUser(i.user.id);
  if(amt<1)return i.reply({content:"❌ Mindestens 1 Coin!",flags:64});
  if(amt>d.coins)return i.reply({content:`❌ Du hast nur **${d.coins} Coins**!`,flags:64});
  
  await i.deferReply();
  
  // Animation mit Emojis
  const embed1 = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle("🪙 COINFLIP")
    .setDescription(`**Einsatz:** ${amt} Coins\n\n🎲 Die Münze wird geworfen...`)
    .setThumbnail(i.user.displayAvatarURL());
  
  await i.editReply({ embeds: [embed1] });
  await new Promise(r=>setTimeout(r,1500));
  
  const embed2 = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle("🪙 COINFLIP")
    .setDescription(`**Einsatz:** ${amt} Coins\n\n🌀 Die Münze dreht sich...`)
    .setThumbnail(i.user.displayAvatarURL());
  
  await i.editReply({ embeds: [embed2] });
  await new Promise(r=>setTimeout(r,1500));
  
  // Ergebnis berechnen
  const won=Math.random()<0.5;
  const newC=won?d.coins+amt:d.coins-amt;
  
  let bonusXP=0;
  const now=Date.now();
  const last=cfXpCd.get(i.user.id);
  
  if(won&&(!last||now-last>=COINFLIP_XP_CD)){
    bonusXP=Math.min(amt*5,MAX_CF_XP);
    cfXpCd.set(i.user.id,now);
    const b=getBoost(d);
    const xpG=Math.floor(bonusXP*(1+b/100));
    const ntx=d.total_xp+xpG;
    const{level:newL,currentXp:cx}=getLevelFromTotalXp(ntx);
    await saveUser(i.user.id,cx,newL,newC,ntx,d.xp_boost,d.xp_boost_until);
    await trackProgress(i.user.id,"xp",xpG);
  }else{
    await saveUser(i.user.id,d.xp,d.level,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
  }
  
  await trackProgress(i.user.id,"coinflips",1);
  if(won)await trackProgress(i.user.id,"coins_earn",amt);
  
  // Ergebnis Embed
  let resultDesc = `**Einsatz:** ${amt} Coins\n\n`;
  if(won) {
    resultDesc += `# 🎉 GEWONNEN!\n\n✅ **+${amt} Coins**`;
    if(bonusXP>0) resultDesc += `\n🎁 **Bonus:** +${bonusXP} XP`;
    resultDesc += `\n\n💰 **Neue Balance:** ${newC} Coins`;
  } else {
    resultDesc += `# 💔 VERLOREN!\n\n❌ **-${amt} Coins**\n\n💰 **Neue Balance:** ${newC} Coins`;
  }
  
  const resultEmbed = new EmbedBuilder()
    .setColor(won ? 0x57F287 : 0xED4245)
    .setTitle(won ? "🎊 JACKPOT!" : "😢 SCHADE!")
    .setDescription(resultDesc)
    .setThumbnail(i.user.displayAvatarURL())
    .setImage(IMAGE)
    .setFooter({ text: won ? "Glückwunsch! 🍀" : "Nächstes Mal klappt's!" });
  
  log(i.client,"INFO","Coinflip",`User: ${i.user.tag}\nEinsatz: ${amt}\nErgebnis: ${won?"WIN":"LOSS"}${bonusXP>0?`\nBonus: ${bonusXP} XP`:''}\nBalance: ${newC}`,i.user);
  return i.editReply({ embeds: [resultEmbed] });
}

async function betlabranking(i) {
  const type=i.options.getString("type");
  await i.deferReply();
  
  if(type==="invites"){
    const{data}=await supabase.from("invites").select("*").order("normal",{ascending:false}).limit(5);
    if(!data||data.length===0)return i.editReply("Noch keine Invites.");
    
    let desc="";
    const m=["🥇","🥈","🥉","4.","5."];
    for(let idx=0;idx<data.length;idx++){
      const u=data[idx];
      let un="Unbekannt";
      try{un=(await i.client.users.fetch(u.user_id)).username;}catch(e){}
      desc+=`${m[idx]} **${un}**\nNormal: ${u.normal||0} | BETLAB: ${u.betlab||0}\n\n`;
    }
    return i.editReply({embeds:[new EmbedBuilder().setColor(COLOR).setTitle("🏆 TOP 5 INVITES").setDescription(desc).setImage(IMAGE)]});
  }
  
  if(type==="coins"){
    const{data}=await supabase.from("levels").select("*").order("coins",{ascending:false}).limit(5);
    let desc="";
    const m=["🥇","🥈","🥉","4.","5."];
    for(let idx=0;idx<data.length;idx++){
      const u=data[idx];
      let un="Unbekannt";
      try{un=(await i.client.users.fetch(u.user_id)).username;}catch(e){}
      desc+=`${m[idx]} **${un}**\nCoins: ${u.coins}\n\n`;
    }
    return i.editReply({embeds:[new EmbedBuilder().setColor(0xF1C40F).setTitle("🏆 TOP 5 COINS").setDescription(desc).setImage(IMAGE)]});
  }
  
  if(type==="xp"){
    const{data}=await supabase.from("levels").select("*").order("total_xp",{ascending:false}).limit(5);
    let desc="";
    const m=["🥇","🥈","🥉","4.","5."];
    for(let idx=0;idx<data.length;idx++){
      const u=data[idx];
      let un="Unbekannt";
      try{un=(await i.client.users.fetch(u.user_id)).username;}catch(e){}
      desc+=`${m[idx]} **${un}**\nLevel: ${u.level} | XP: ${u.total_xp}\n\n`;
    }
    return i.editReply({embeds:[new EmbedBuilder().setColor(COLOR).setTitle("🏆 TOP 5 XP").setDescription(desc).setImage(IMAGE)]});
  }
}

async function betlabeditcoins(i) {
  if(!i.member.roles.cache.has("963870711678640188"))return i.reply({content:"❌ Keine Berechtigung.",flags:64});
  await i.deferReply({flags:64});
  const t=i.options.getUser("user");
  const amt=i.options.getInteger("anzahl");
  console.log("💰 EDIT COINS - User:", t.tag, "| Neue Coins:", amt);
  
  const d=await getUser(t.id);
  console.log("📊 Vorher - Coins:", d.coins, "| Level:", d.level, "| XP:", d.total_xp);
  
  // User in DB erstellen falls nicht existiert
  if(!d.user_id) {
    console.log("🆕 User existiert nicht, erstelle neu...");
    await saveUser(t.id,0,0,amt,0,0,null);
  } else {
    console.log("✏️ Update existierenden User...");
    await saveUser(t.id,d.xp,d.level,amt,d.total_xp,d.xp_boost,d.xp_boost_until);
  }
  
  // Check ob es gespeichert wurde
  const updated=await getUser(t.id);
  console.log("📊 Nachher - Coins:", updated.coins, "| Level:", updated.level, "| XP:", updated.total_xp);
  
  if(updated.coins === amt) {
    console.log("✅ Coins erfolgreich gesetzt!");
  } else {
    console.log("❌ FEHLER: Coins wurden NICHT gesetzt!");
  }
  
  log(i.client,"COINS","Coins editiert",`Ziel: ${t.tag}\nVorher: ${d.coins} → ${amt}`,i.user);
  return i.editReply(`✅ Coins von **${t.username}** auf **${amt}** gesetzt.\n\n**Debug:**\nVorher: ${d.coins} Coins\nNachher: ${updated.coins} Coins`);
}

async function betlabeditxp(i) {
  if(!i.member.roles.cache.has("963870711678640188"))return i.reply({content:"❌ Keine Berechtigung.",flags:64});
  await i.deferReply({flags:64});
  const t=i.options.getUser("user");
  const tx=i.options.getInteger("xp");
  const d=await getUser(t.id);
  const oldL=d.level;
  const{level:newL,currentXp:cx}=getLevelFromTotalXp(tx);
  
  // User in DB erstellen falls nicht existiert
  if(!d.user_id) {
    await saveUser(t.id,cx,newL,0,tx,0,null);
  } else {
    await saveUser(t.id,cx,newL,d.coins,tx,d.xp_boost,d.xp_boost_until);
  }
  
  if(newL!==oldL){
    const m=i.guild.members.cache.get(t.id)||await i.guild.members.fetch(t.id);
    await updateRoles(m,oldL,newL,i.client);
    
    let bt="";
    if(newL===100)bt="\n🎊 **MAX LEVEL!** 🎊";
    else if(newL===75||newL===50||newL===25)bt="\n🎁 **MILESTONE!**";
    else if(newL%5===0)bt="\n⭐ **5er Milestone!**";
    
    const e=new EmbedBuilder().setColor(0xF1C40F).setTitle("🎉 LEVEL ANGEPASST!")
      .setDescription(`<@${t.id}> wurde angepasst!\n\n📊 **Level:** ${oldL} → **${newL}**${bt}`)
      .setThumbnail(t.displayAvatarURL()).setImage(IMAGE).setTimestamp();
    
    try{
      const ch=i.client.channels.cache.get(LEVELUP_CH)||await i.client.channels.fetch(LEVELUP_CH);
      if(ch)await ch.send({embeds:[e]});
    }catch(e){}
  }
  
  log(i.client,"XP","XP editiert",`Ziel: ${t.tag}\nVorher: ${d.total_xp} (Lvl ${oldL})\nNachher: ${tx} (Lvl ${newL})`,i.user);
  return i.editReply(`✅ XP von **${t.username}** auf **${tx}** gesetzt.\n**Neues Level:** ${newL}`);
}

async function handleCommand(i) {
  const n=i.commandName;
  if(n==="betlabcoins"){betlabcoins(i);return true;}
  if(n==="betlabxp"){betlabxp(i);return true;}
  if(n==="betlabcoinflip"){betlabcf(i);return true;}
  if(n==="betlabdice"){betlabdice(i);return true;}
  if(n==="betlabblackjack"){betlabblackjack(i);return true;}
  if(n==="betlabhighlow"){betlabhighlow(i);return true;}
  if(n==="betlabrace"){betlabrace(i);return true;}
  if(n==="betlabspin"){const {betlabspin}=require("./dailyspin");betlabspin(i);return true;}
  if(n==="betlabranking"){betlabranking(i);return true;}
  if(n==="betlabeditcoins"){betlabeditcoins(i);return true;}
  if(n==="betlabeditxp"){betlabeditxp(i);return true;}
  return false;
}

module.exports={handleMessage,handleReaction,handleCommand,handleBlackjackButton,handleHighLowButton,handleRaceButton};

// ═══════════════════════════════════════════════════════════════════════════════
// DICE GAME
// ═══════════════════════════════════════════════════════════════════════════════

const DICE_EMOJI = ["⚀","⚁","⚂","⚃","⚄","⚅"];

async function betlabdice(i) {
  const amt=i.options.getInteger("anzahl");
  const guess=i.options.getInteger("zahl");
  const d=await getUser(i.user.id);
  
  if(amt<1)return i.reply({content:"❌ Mindestens 1 Coin!",flags:64});
  if(amt>d.coins)return i.reply({content:`❌ Du hast nur **${d.coins} Coins**!`,flags:64});
  if(guess<1||guess>6)return i.reply({content:"❌ Zahl muss zwischen 1-6 sein!",flags:64});
  
  await i.deferReply();
  
  // Animation
  const embed1=new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle("🎲 DICE GAME")
    .setDescription(`**Einsatz:** ${amt} Coins\n**Deine Wahl:** ${guess}\n\n🎲 Der Würfel rollt...`)
    .setThumbnail(i.user.displayAvatarURL());
  
  await i.editReply({embeds:[embed1]});
  await new Promise(r=>setTimeout(r,1500));
  
  const embed2=new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle("🎲 DICE GAME")
    .setDescription(`**Einsatz:** ${amt} Coins\n**Deine Wahl:** ${guess}\n\n🌀 Der Würfel dreht sich...`)
    .setThumbnail(i.user.displayAvatarURL());
  
  await i.editReply({embeds:[embed2]});
  await new Promise(r=>setTimeout(r,1500));
  
  // Ergebnis
  const rolled=Math.floor(Math.random()*6)+1;
  const won=rolled===guess;
  const winAmount=won?amt*5:0;
  const newC=won?d.coins+winAmount:d.coins-amt;
  
  // XP Bonus bei Gewinn
  let bonusXP=0;
  const now=Date.now();
  const last=cfXpCd.get(i.user.id);
  
  if(won&&(!last||now-last>=COINFLIP_XP_CD)){
    bonusXP=Math.min(amt*5,MAX_CF_XP);
    cfXpCd.set(i.user.id,now);
    const b=getBoost(d);
    const xpG=Math.floor(bonusXP*(1+b/100));
    const ntx=d.total_xp+xpG;
    const{level:newL,currentXp:cx}=getLevelFromTotalXp(ntx);
    await saveUser(i.user.id,cx,newL,newC,ntx,d.xp_boost,d.xp_boost_until);
    await trackProgress(i.user.id,"xp",xpG);
  }else{
    await saveUser(i.user.id,d.xp,d.level,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
  }
  
  let resultDesc=`**Einsatz:** ${amt} Coins\n**Deine Wahl:** ${guess}\n**Gewürfelt:** ${DICE_EMOJI[rolled-1]} **${rolled}**\n\n`;
  if(won){
    resultDesc+=`# 🎉 RICHTIG GERATEN!\n\n✅ **+${winAmount} Coins** (5x Gewinn!)`;
    if(bonusXP>0)resultDesc+=`\n🎁 **Bonus:** +${bonusXP} XP`;
    resultDesc+=`\n\n💰 **Neue Balance:** ${newC} Coins`;
  }else{
    resultDesc+=`# 💔 FALSCH!\n\n❌ **-${amt} Coins**\n\n💰 **Neue Balance:** ${newC} Coins`;
  }
  
  const resultEmbed=new EmbedBuilder()
    .setColor(won?0x57F287:0xED4245)
    .setTitle(won?"🎊 JACKPOT!":"😢 SCHADE!")
    .setDescription(resultDesc)
    .setThumbnail(i.user.displayAvatarURL())
    .setImage(IMAGE)
    .setFooter({text:won?"5x Gewinn! 🍀":"Nächstes Mal klappt's!"});
  
  log(i.client,"INFO","Dice",`User: ${i.user.tag}\nEinsatz: ${amt}\nGewählt: ${guess}\nGewürfelt: ${rolled}\nErgebnis: ${won?"WIN":"LOSS"}\nBalance: ${newC}`,i.user);
  return i.editReply({embeds:[resultEmbed]});
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLACKJACK
// ═══════════════════════════════════════════════════════════════════════════════

const CARD_SUITS=["♠️","♥️","♣️","♦️"];
const CARD_VALUES=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function drawCard(){
  const suit=CARD_SUITS[Math.floor(Math.random()*4)];
  const value=CARD_VALUES[Math.floor(Math.random()*13)];
  return{suit,value};
}

function cardValue(card){
  if(card.value==="A")return 11;
  if(["J","Q","K"].includes(card.value))return 10;
  return parseInt(card.value);
}

function handValue(hand){
  let val=0;
  let aces=0;
  for(const c of hand){
    val+=cardValue(c);
    if(c.value==="A")aces++;
  }
  while(val>21&&aces>0){val-=10;aces--;}
  return val;
}

function showHand(hand,hideFirst=false){
  if(hideFirst)return`🂠 **??** | ${hand[1].suit} **${hand[1].value}**`;
  return hand.map(c=>`${c.suit} **${c.value}**`).join(" | ");
}

const bjGames=new Map();

async function betlabblackjack(i) {
  console.log("🃏 Blackjack Command erhalten von:", i.user.tag);
  const amt=i.options.getInteger("anzahl");
  console.log("💰 Einsatz:", amt);
  const d=await getUser(i.user.id);
  console.log("👤 User Coins:", d.coins);
  
  if(amt<1){
    console.log("❌ Zu wenig Coins");
    return await i.reply({content:"❌ Mindestens 1 Coin!",flags:64});
  }
  if(amt>d.coins){
    console.log("❌ Nicht genug Coins");
    return await i.reply({content:`❌ Du hast nur **${d.coins} Coins**!`,flags:64});
  }
  if(bjGames.has(i.user.id)){
    console.log("❌ Spiel läuft bereits");
    return await i.reply({content:"❌ Du hast bereits ein Spiel laufen!",flags:64});
  }
  
  console.log("✅ Starte Blackjack Spiel...");
  const playerHand=[drawCard(),drawCard()];
  const dealerHand=[drawCard(),drawCard()];
  
  bjGames.set(i.user.id,{playerHand,dealerHand,bet:amt,coins:d.coins});
  
  const pVal=handValue(playerHand);
  const dVal=handValue(dealerHand);
  console.log("🎴 Player:", pVal, "| Dealer:", dVal);
  
  let desc=`**Einsatz:** ${amt} Coins\n\n`;
  desc+=`**Deine Hand:** ${showHand(playerHand)}\n**Wert:** ${pVal}\n\n`;
  desc+=`**Dealer:** ${showHand(dealerHand,true)}\n\n`;
  
  const embed=new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle("🃏 BLACKJACK")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({text:"Hit = Karte ziehen | Stand = Stehen bleiben"});
  
  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("bj_hit").setLabel("🎴 HIT").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("bj_stand").setLabel("✋ STAND").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("bj_double").setLabel("⚡ DOUBLE").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("bj_surrender").setLabel("🏳️ SURRENDER").setStyle(ButtonStyle.Secondary)
  );
  
  if(pVal===21){
    console.log("🎊 BLACKJACK!");
    bjGames.delete(i.user.id);
    return await bjBlackjack(i,playerHand,dealerHand,amt,d);
  }
  
  console.log("📤 Sende Reply...");
  try {
    await i.reply({embeds:[embed],components:[row]});
    console.log("✅ Reply gesendet!");
  } catch(e) {
    console.error("❌ Reply Fehler:", e);
  }
}

async function handleBlackjackButton(i,client){
  const game=bjGames.get(i.user.id);
  if(!game)return await i.reply({content:"❌ Kein aktives Spiel!",flags:64});
  
  const{playerHand,dealerHand,bet,coins}=game;
  
  if(i.customId==="bj_hit"){
    playerHand.push(drawCard());
    const pVal=handValue(playerHand);
    
    if(pVal>21){
      await bjBust(i,playerHand,dealerHand,bet,coins);
      bjGames.delete(i.user.id);
      return;
    }
    
    let desc=`**Einsatz:** ${bet} Coins\n\n`;
    desc+=`**Deine Hand:** ${showHand(playerHand)}\n**Wert:** ${pVal}\n\n`;
    desc+=`**Dealer:** ${showHand(dealerHand,true)}\n\n`;
    
    const embed=new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle("🃏 BLACKJACK")
      .setDescription(desc)
      .setThumbnail(i.user.displayAvatarURL())
      .setFooter({text:"Hit = Karte ziehen | Stand = Stehen bleiben"});
    
    const row=new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bj_hit").setLabel("🎴 HIT").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("bj_stand").setLabel("✋ STAND").setStyle(ButtonStyle.Danger)
    );
    
    return await i.update({embeds:[embed],components:[row]});
  }
  
  if(i.customId==="bj_double"){
    // Check genug Coins
    if(coins<bet*2){
      return await i.reply({content:"❌ Nicht genug Coins zum Verdoppeln!",flags:64});
    }
    
    // Verdoppel Einsatz, ziehe 1 Karte, dann Stand
    game.bet = bet * 2;
    playerHand.push(drawCard());
    const pVal=handValue(playerHand);
    
    if(pVal>21){
      await bjBust(i,playerHand,dealerHand,bet*2,coins);
      bjGames.delete(i.user.id);
      return;
    }
    
    // Dealer zieht
    while(handValue(dealerHand)<17){
      dealerHand.push(drawCard());
    }
    
    await bjResolve(i,playerHand,dealerHand,bet*2,coins);
    bjGames.delete(i.user.id);
    return;
  }
  
  if(i.customId==="bj_surrender"){
    // 50% vom Einsatz zurück
    const returnAmount=Math.floor(bet*0.5);
    const newC=coins-bet+returnAmount;
    const d=await getUser(i.user.id);
    await saveUser(i.user.id,d.xp,d.level,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
    
    let desc=`**Einsatz:** ${bet} Coins\n\n`;
    desc+=`**Deine Hand:** ${showHand(playerHand)}\n**Wert:** ${handValue(playerHand)}\n\n`;
    desc+=`**Dealer:** ${showHand(dealerHand,true)}\n\n`;
    desc+=`# 🏳️ AUFGEGEBEN!\n\n↩️ **+${returnAmount} Coins zurück** (50%)\n\n💰 **Neue Balance:** ${newC} Coins`;
    
    const embed=new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle("🏳️ SURRENDER")
      .setDescription(desc)
      .setThumbnail(i.user.displayAvatarURL())
      .setImage(IMAGE)
      .setFooter({text:"50% zurück - Nächstes Mal!"});
    
    log(i.client,"INFO","Blackjack",`User: ${i.user.tag}\nEinsatz: ${bet}\nErgebnis: SURRENDER\nZurück: ${returnAmount}\nBalance: ${newC}`,i.user);
    await i.update({embeds:[embed],components:[]});
    bjGames.delete(i.user.id);
    return;
  }
  
  if(i.customId==="bj_stand"){
    // Dealer zieht
    while(handValue(dealerHand)<17){
      dealerHand.push(drawCard());
    }
    
    // Erst resolve, DANN delete
    await bjResolve(i,playerHand,dealerHand,bet,coins);
    bjGames.delete(i.user.id);
    return;
  }
}

async function bjBlackjack(i,playerHand,dealerHand,bet,d){
  const winAmount=Math.floor(bet*2.5);
  const newC=d.coins+winAmount;
  await saveUser(i.user.id,d.xp,d.level,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
  
  let desc=`**Einsatz:** ${bet} Coins\n\n`;
  desc+=`**Deine Hand:** ${showHand(playerHand)}\n**Wert:** 21\n\n`;
  desc+=`**Dealer:** ${showHand(dealerHand)}\n**Wert:** ${handValue(dealerHand)}\n\n`;
  desc+=`# 🎉 BLACKJACK!\n\n✅ **+${winAmount} Coins** (2.5x Gewinn!)\n\n💰 **Neue Balance:** ${newC} Coins`;
  
  const embed=new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("🎊 BLACKJACK!")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setImage(IMAGE)
    .setFooter({text:"BLACKJACK! 🍀"});
  
  log(i.client,"INFO","Blackjack",`User: ${i.user.tag}\nEinsatz: ${bet}\nErgebnis: BLACKJACK\nBalance: ${newC}`,i.user);
  return await i.reply({embeds:[embed]});
}

async function bjBust(i,playerHand,dealerHand,bet,coins){
  const newC=coins-bet;
  const d=await getUser(i.user.id);
  await saveUser(i.user.id,d.xp,d.level,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
  
  const pVal=handValue(playerHand);
  
  let desc=`**Einsatz:** ${bet} Coins\n\n`;
  desc+=`**Deine Hand:** ${showHand(playerHand)}\n**Wert:** ${pVal}\n\n`;
  desc+=`**Dealer:** ${showHand(dealerHand,true)}\n\n`;
  desc+=`# 💥 BUST!\n\n❌ **-${bet} Coins**\n\n💰 **Neue Balance:** ${newC} Coins`;
  
  const embed=new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle("💥 BUST!")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setImage(IMAGE)
    .setFooter({text:"Über 21! Nächstes Mal!"});
  
  log(i.client,"INFO","Blackjack",`User: ${i.user.tag}\nEinsatz: ${bet}\nErgebnis: BUST\nBalance: ${newC}`,i.user);
  return await i.update({embeds:[embed],components:[]});
}

async function bjResolve(i,playerHand,dealerHand,bet,coins){
  const pVal=handValue(playerHand);
  const dVal=handValue(dealerHand);
  const d=await getUser(i.user.id);
  
  let result,winAmount,newC,bonusXP=0;
  
  if(dVal>21||pVal>dVal){
    result="WIN";
    winAmount=bet*2;
    newC=coins+bet;
    
    // XP Bonus bei Gewinn
    const now=Date.now();
    const last=cfXpCd.get(i.user.id);
    if(!last||now-last>=COINFLIP_XP_CD){
      bonusXP=Math.min(bet*5,MAX_CF_XP);
      cfXpCd.set(i.user.id,now);
      const b=getBoost(d);
      const xpG=Math.floor(bonusXP*(1+b/100));
      const ntx=d.total_xp+xpG;
      const{level:newL,currentXp:cx}=getLevelFromTotalXp(ntx);
      await saveUser(i.user.id,cx,newL,newC,ntx,d.xp_boost,d.xp_boost_until);
      await trackProgress(i.user.id,"xp",xpG);
    }else{
      await saveUser(i.user.id,d.xp,d.level,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
    }
  }else if(pVal===dVal){
    result="PUSH";
    winAmount=0;
    newC=coins;
    await saveUser(i.user.id,d.xp,d.level,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
  }else{
    result="LOSS";
    winAmount=0;
    newC=coins-bet;
    await saveUser(i.user.id,d.xp,d.level,newC,d.total_xp,d.xp_boost,d.xp_boost_until);
  }
  
  let desc=`**Einsatz:** ${bet} Coins\n\n`;
  desc+=`**Deine Hand:** ${showHand(playerHand)}\n**Wert:** ${pVal}\n\n`;
  desc+=`**Dealer:** ${showHand(dealerHand)}\n**Wert:** ${dVal}\n\n`;
  
  if(result==="WIN"){
    desc+=`# 🎉 GEWONNEN!\n\n✅ **+${bet} Coins**`;
    if(bonusXP>0)desc+=`\n🎁 **Bonus:** +${bonusXP} XP`;
    desc+=`\n\n💰 **Neue Balance:** ${newC} Coins`;
  }else if(result==="PUSH"){
    desc+=`# 🤝 UNENTSCHIEDEN!\n\n↔️ **Einsatz zurück**\n\n💰 **Balance:** ${newC} Coins`;
  }else{
    desc+=`# 💔 VERLOREN!\n\n❌ **-${bet} Coins**\n\n💰 **Neue Balance:** ${newC} Coins`;
  }
  
  const embed=new EmbedBuilder()
    .setColor(result==="WIN"?0x57F287:result==="PUSH"?0xF1C40F:0xED4245)
    .setTitle(result==="WIN"?"🎊 GEWONNEN!":result==="PUSH"?"🤝 UNENTSCHIEDEN":"😢 VERLOREN")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setImage(IMAGE)
    .setFooter({text:result==="WIN"?"Glückwunsch! 🍀":result==="PUSH"?"Kein Gewinner!":"Nächstes Mal klappt's!"});
  
  log(i.client,"INFO","Blackjack",`User: ${i.user.tag}\nEinsatz: ${bet}\nErgebnis: ${result}${bonusXP>0?`\nBonus: ${bonusXP} XP`:''}\nBalance: ${newC}`,i.user);
  return await i.update({embeds:[embed],components:[]});
}


// ═══════════════════════════════════════════════════════════════════════════════
// HIGH/LOW GAME
// ═══════════════════════════════════════════════════════════════════════════════

const hlGames = new Map();
const HIGHLOW_MULTIPLIERS = [1.5, 2, 3, 4.5, 6, 8, 12, 18, 25, 40];

async function betlabhighlow(i) {
  const amt = i.options.getInteger("anzahl");
  const d = await getUser(i.user.id);
  
  if(amt < 1) return await i.reply({content: "❌ Mindestens 1 Coin!", flags: 64});
  if(amt > d.coins) return await i.reply({content: `❌ Du hast nur **${d.coins} Coins**!`, flags: 64});
  if(hlGames.has(i.user.id)) return await i.reply({content: "❌ Du hast bereits ein Spiel laufen!", flags: 64});
  
  const firstNum = Math.floor(Math.random() * 100) + 1;
  hlGames.set(i.user.id, {
    bet: amt,
    coins: d.coins,
    round: 0,
    currentNum: firstNum,
    history: [firstNum]
  });
  
  let desc = `**Einsatz:** ${amt} Coins\n**Runde:** 1\n**Multiplikator:** ${HIGHLOW_MULTIPLIERS[0]}x\n\n`;
  desc += `# 🎲 AKTUELLE ZAHL: **${firstNum}**\n\n`;
  desc += `Wird die nächste Zahl höher oder niedriger sein?`;
  
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle("🔢 HIGH/LOW")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({text: "Tipp richtig = Weiter! Falsch = Alles verloren!"});
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("hl_higher").setLabel("📈 HIGHER").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("hl_lower").setLabel("📉 LOWER").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("hl_cashout").setLabel("💰 CASHOUT").setStyle(ButtonStyle.Primary).setDisabled(true)
  );
  
  return await i.reply({embeds: [embed], components: [row]});
}

async function handleHighLowButton(i, client) {
  const game = hlGames.get(i.user.id);
  if(!game) return await i.reply({content: "❌ Kein aktives Spiel!", flags: 64});
  
  const {bet, coins, round, currentNum, history} = game;
  
  if(i.customId === "hl_cashout") {
    const multi = HIGHLOW_MULTIPLIERS[round];
    const winAmount = Math.floor(bet * multi);
    const newC = coins + winAmount - bet;
    
    const d = await getUser(i.user.id);
    
    // XP Bonus
    let bonusXP = 0;
    const now = Date.now();
    const last = cfXpCd.get(i.user.id);
    if(!last || now - last >= COINFLIP_XP_CD) {
      bonusXP = Math.min(winAmount * 5, MAX_CF_XP);
      cfXpCd.set(i.user.id, now);
      const b = getBoost(d);
      const xpG = Math.floor(bonusXP * (1 + b / 100));
      const ntx = d.total_xp + xpG;
      const {level: newL, currentXp: cx} = getLevelFromTotalXp(ntx);
      await saveUser(i.user.id, cx, newL, newC, ntx, d.xp_boost, d.xp_boost_until);
      await trackProgress(i.user.id, "xp", xpG);
    } else {
      await saveUser(i.user.id, d.xp, d.level, newC, d.total_xp, d.xp_boost, d.xp_boost_until);
    }
    
    let desc = `**Einsatz:** ${bet} Coins\n**Runden geschafft:** ${round}\n**Multiplikator:** ${multi}x\n\n`;
    desc += `# 💰 AUSGEZAHLT!\n\n✅ **+${winAmount} Coins**`;
    if(bonusXP > 0) desc += `\n🎁 **Bonus:** +${bonusXP} XP`;
    desc += `\n\n💰 **Neue Balance:** ${newC} Coins`;
    
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🎊 GEWINN GESICHERT!")
      .setDescription(desc)
      .setThumbnail(i.user.displayAvatarURL())
      .setImage(IMAGE)
      .setFooter({text: `${round} Runden gemeistert! 🍀`});
    
    log(i.client, "INFO", "HighLow", `User: ${i.user.tag}\nEinsatz: ${bet}\nRunden: ${round}\nGewinn: ${winAmount}\nBalance: ${newC}`, i.user);
    await i.update({embeds: [embed], components: []});
    hlGames.delete(i.user.id);
    return;
  }
  
  const choice = i.customId === "hl_higher" ? "higher" : "lower";
  
  // Animation
  await i.deferUpdate();
  
  let desc = `**Einsatz:** ${bet} Coins\n**Runde:** ${round + 1}\n\n`;
  desc += `**Letzte Zahl:** ${currentNum}\n**Deine Wahl:** ${choice === "higher" ? "📈 HIGHER" : "📉 LOWER"}\n\n`;
  desc += `🎲 Neue Zahl wird gezogen...`;
  
  const animEmbed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle("🔢 HIGH/LOW")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL());
  
  await i.editReply({embeds: [animEmbed], components: []});
  await new Promise(r => setTimeout(r, 2000));
  
  const newNum = Math.floor(Math.random() * 100) + 1;
  const correct = (choice === "higher" && newNum > currentNum) || (choice === "lower" && newNum < currentNum);
  
  if(!correct || newNum === currentNum) {
    // VERLOREN
    const newC = coins - bet;
    const d = await getUser(i.user.id);
    await saveUser(i.user.id, d.xp, d.level, newC, d.total_xp, d.xp_boost, d.xp_boost_until);
    
    let loseDesc = `**Einsatz:** ${bet} Coins\n**Runden geschafft:** ${round}\n\n`;
    loseDesc += `**Letzte Zahl:** ${currentNum}\n**Neue Zahl:** ${newNum}\n\n`;
    loseDesc += `# 💔 FALSCH!\n\n❌ **-${bet} Coins**\n\n💰 **Neue Balance:** ${newC} Coins`;
    
    const loseEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("😢 GAME OVER!")
      .setDescription(loseDesc)
      .setThumbnail(i.user.displayAvatarURL())
      .setImage(IMAGE)
      .setFooter({text: "Nächstes Mal klappt's!"});
    
    log(i.client, "INFO", "HighLow", `User: ${i.user.tag}\nEinsatz: ${bet}\nRunden: ${round}\nErgebnis: LOSS\nBalance: ${newC}`, i.user);
    await i.editReply({embeds: [loseEmbed], components: []});
    hlGames.delete(i.user.id);
    return;
  }
  
  // RICHTIG - Weiter!
  const newRound = round + 1;
  const multi = HIGHLOW_MULTIPLIERS[newRound];
  game.round = newRound;
  game.currentNum = newNum;
  game.history.push(newNum);
  
  let nextDesc = `**Einsatz:** ${bet} Coins\n**Runde:** ${newRound + 1}\n**Multiplikator:** ${multi}x\n\n`;
  nextDesc += `# 🎲 AKTUELLE ZAHL: **${newNum}**\n\n`;
  nextDesc += `**Verlauf:** ${history.join(" → ")} → **${newNum}**\n\n`;
  nextDesc += `Wird die nächste Zahl höher oder niedriger sein?`;
  
  const nextEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("✅ RICHTIG!")
    .setDescription(nextDesc)
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({text: `Aktueller Gewinn: ${Math.floor(bet * multi)} Coins`});
  
  const nextRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("hl_higher").setLabel("📈 HIGHER").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("hl_lower").setLabel("📉 LOWER").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("hl_cashout").setLabel("💰 CASHOUT").setStyle(ButtonStyle.Primary)
  );
  
  await i.editReply({embeds: [nextEmbed], components: [nextRow]});
}


// ═══════════════════════════════════════════════════════════════════════════════
// RACE GAME
// ═══════════════════════════════════════════════════════════════════════════════

const RACE_ANIMALS = [
  { id: 1, emoji: "🐎", name: "Pferd" },
  { id: 2, emoji: "🐕", name: "Hund" },
  { id: 3, emoji: "🐇", name: "Hase" },
  { id: 4, emoji: "🐢", name: "Schildkröte" },
  { id: 5, emoji: "🦘", name: "Känguru" },
  { id: 6, emoji: "🐆", name: "Gepard" },
  { id: 7, emoji: "🦊", name: "Fuchs" },
  { id: 8, emoji: "🐿️", name: "Eichhörnchen" },
  { id: 9, emoji: "🦌", name: "Hirsch" },
  { id: 10, emoji: "🐅", name: "Tiger" }
];

const raceGames = new Map();

async function betlabrace(i) {
  const amt = i.options.getInteger("anzahl");
  const d = await getUser(i.user.id);
  
  if(amt < 1) return await i.reply({content: "❌ Mindestens 1 Coin!", flags: 64});
  if(amt > d.coins) return await i.reply({content: `❌ Du hast nur **${d.coins} Coins**!`, flags: 64});
  if(raceGames.has(i.user.id)) return await i.reply({content: "❌ Du hast bereits ein Rennen laufen!", flags: 64});
  
  raceGames.set(i.user.id, { bet: amt, coins: d.coins });
  
  let desc = `**Einsatz:** ${amt} Coins\n\n🏁 **WÄHLE DEIN TIER!**\n\n`;
  for(const a of RACE_ANIMALS) {
    desc += `**${a.id}.** ${a.emoji} ${a.name}\n`;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle("🏇 RACE - TIER WÄHLEN")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({text: "Klicke auf dein Tier!"});
  
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("race_1").setLabel("1️⃣ 🐎").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("race_2").setLabel("2️⃣ 🐕").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("race_3").setLabel("3️⃣ 🐇").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("race_4").setLabel("4️⃣ 🐢").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("race_5").setLabel("5️⃣ 🦘").setStyle(ButtonStyle.Primary)
  );
  
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("race_6").setLabel("6️⃣ 🐆").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("race_7").setLabel("7️⃣ 🦊").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("race_8").setLabel("8️⃣ 🐿️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("race_9").setLabel("9️⃣ 🦌").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("race_10").setLabel("🔟 🐅").setStyle(ButtonStyle.Primary)
  );
  
  return await i.reply({embeds: [embed], components: [row1, row2]});
}

async function handleRaceButton(i, client) {
  const game = raceGames.get(i.user.id);
  if(!game) return await i.reply({content: "❌ Kein aktives Rennen!", flags: 64});
  
  const choice = parseInt(i.customId.split("_")[1]);
  const selected = RACE_ANIMALS[choice - 1];
  const {bet, coins} = game;
  
  await i.deferUpdate();
  
  // START
  let desc = `**Einsatz:** ${bet} Coins\n**Deine Wahl:** ${selected.emoji} **${selected.name}** (#${choice})\n\n`;
  desc += `🏁 **DAS RENNEN BEGINNT!**\n\n`;
  desc += `Auf die Plätze... Fertig...`;
  
  const embed1 = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle("🏇 RACE")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({text: "⏱️ Das Rennen startet gleich!"});
  
  await i.editReply({embeds: [embed1], components: []});
  await new Promise(r => setTimeout(r, 1500));
  
  // Rennen simulieren - jedes Tier bekommt zufällige Geschwindigkeit
  const raceResults = RACE_ANIMALS.map(a => ({
    ...a,
    speed: Math.random() * 100 + 50,
    progress: 0
  }));
  
  // Animation Phasen: 25%, 50%, 75%, 100%
  const phases = [
    {pct: 25, text: "🏁 **25% - DAS FELD IST NOCH DICHT!**", color: 0xE67E22},
    {pct: 50, text: "🏁 **50% - ES BILDEN SICH FAVORITEN!**", color: 0xE74C3C},
    {pct: 75, text: "🏁 **75% - DER ENDSPURT BEGINNT!**", color: 0x9B59B6},
    {pct: 100, text: "🏁 **ZIELEINLAUF!**", color: 0xF1C40F}
  ];
  
  for(const phase of phases) {
    for(const r of raceResults) {
      r.progress = Math.min((r.speed / 150) * phase.pct, phase.pct);
    }
    raceResults.sort((a, b) => b.progress - a.progress);
    
    let phaseDesc = `**Einsatz:** ${bet} Coins\n**Deine Wahl:** ${selected.emoji} **${selected.name}**\n\n`;
    phaseDesc += `${phase.text}\n\n`;
    
    for(let idx = 0; idx < raceResults.length; idx++) {
      const a = raceResults[idx];
      const barLength = Math.floor(a.progress / 10);
      const bar = "▓".repeat(barLength) + "░".repeat(10 - barLength);
      const marker = a.id === choice ? " ← 🎯" : "";
      phaseDesc += `${a.emoji} ${bar}${marker}\n`;
    }
    
    const phaseEmbed = new EmbedBuilder()
      .setColor(phase.color)
      .setTitle("🏇 RACE")
      .setDescription(phaseDesc)
      .setThumbnail(i.user.displayAvatarURL());
    
    await i.editReply({embeds: [phaseEmbed]});
    await new Promise(r => setTimeout(r, 1500));
  }
  
  // Finale Sortierung nach Geschwindigkeit
  raceResults.sort((a, b) => b.speed - a.speed);
  
  // ERGEBNIS
  const place = raceResults.findIndex(a => a.id === choice) + 1;
  let multi = 0;
  let result = "";
  
  if(place === 1) {
    multi = 5;
    result = "WIN";
  } else if(place === 2) {
    multi = 3;
    result = "WIN";
  } else if(place === 3) {
    multi = 2;
    result = "WIN";
  } else if(place === 4 || place === 5) {
    multi = 1;
    result = "PUSH";
  } else {
    multi = 0;
    result = "LOSS";
  }
  
  const winAmount = Math.floor(bet * multi);
  const d = await getUser(i.user.id);
  const newC = result === "LOSS" ? coins - bet : coins - bet + winAmount;
  
  // XP Bonus bei Top 3
  let bonusXP = 0;
  if(result === "WIN") {
    const now = Date.now();
    const last = cfXpCd.get(i.user.id);
    if(!last || now - last >= COINFLIP_XP_CD) {
      bonusXP = Math.min((winAmount - bet) * 5, MAX_CF_XP);
      cfXpCd.set(i.user.id, now);
      const b = getBoost(d);
      const xpG = Math.floor(bonusXP * (1 + b / 100));
      const ntx = d.total_xp + xpG;
      const {level: newL, currentXp: cx} = getLevelFromTotalXp(ntx);
      await saveUser(i.user.id, cx, newL, newC, ntx, d.xp_boost, d.xp_boost_until);
      await trackProgress(i.user.id, "xp", xpG);
    } else {
      await saveUser(i.user.id, d.xp, d.level, newC, d.total_xp, d.xp_boost, d.xp_boost_until);
    }
  } else {
    await saveUser(i.user.id, d.xp, d.level, newC, d.total_xp, d.xp_boost, d.xp_boost_until);
  }
  
  // Ergebnis Embed
  let desc3 = `**Einsatz:** ${bet} Coins\n**Deine Wahl:** ${selected.emoji} **${selected.name}**\n\n`;
  desc3 += `🏁 **ENDERGEBNIS:**\n\n`;
  
  for(let idx = 0; idx < Math.min(5, raceResults.length); idx++) {
    const a = raceResults[idx];
    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx === 3 || idx === 4 ? "🏅" : "";
    const marker = a.id === choice ? " ← **DU**" : "";
    desc3 += `${medal} **Platz ${idx + 1}:** ${a.emoji} ${a.name}${marker}\n`;
  }
  
  desc3 += `\n`;
  
  if(result === "WIN") {
    desc3 += `# 🎉 PLATZ ${place}!\n\n✅ **+${winAmount} Coins** (${multi}x)`;
    if(bonusXP > 0) desc3 += `\n🎁 **Bonus:** +${bonusXP} XP`;
  } else if(result === "PUSH") {
    desc3 += `# 🤝 PLATZ ${place}!\n\n↔️ **Einsatz zurück** (+${bet} Coins)`;
  } else {
    desc3 += `# 💔 PLATZ ${place}!\n\n❌ **-${bet} Coins**`;
  }
  
  desc3 += `\n\n💰 **Neue Balance:** ${newC} Coins`;
  
  const resultEmbed = new EmbedBuilder()
    .setColor(result === "WIN" ? 0x57F287 : result === "PUSH" ? 0xF1C40F : 0xED4245)
    .setTitle(result === "WIN" ? "🎊 GEWONNEN!" : result === "PUSH" ? "🤝 UNENTSCHIEDEN" : "😢 VERLOREN")
    .setDescription(desc3)
    .setThumbnail(i.user.displayAvatarURL())
    .setImage(IMAGE)
    .setFooter({text: result === "WIN" ? `Top ${place}! 🍀` : result === "PUSH" ? "Platz 4-5!" : "Nächstes Mal!"});
  
  log(i.client, "INFO", "Race", `User: ${i.user.tag}\nEinsatz: ${bet}\nTier: ${selected.name}\nPlatz: ${place}\nErgebnis: ${result}\nBalance: ${newC}`, i.user);
  await i.editReply({embeds: [resultEmbed]});
  raceGames.delete(i.user.id);
}

