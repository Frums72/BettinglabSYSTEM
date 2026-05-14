const { EmbedBuilder } = require("discord.js");
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
  await supabase.from("levels").upsert({user_id:uid,xp,level:l,coins:c,total_xp:tx,xp_boost:b,xp_boost_until:bu});
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
  
  const anim=await i.editReply("🪙 Münze wird geworfen...");
  await new Promise(r=>setTimeout(r,1000));
  await anim.edit("🪙 Die Münze dreht sich...");
  await new Promise(r=>setTimeout(r,1000));
  
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
  
  const e=new EmbedBuilder().setColor(won?0x57F287:0xED4245).setTitle(won?"🎉 GEWONNEN!":"💔 VERLOREN!")
    .setDescription(`**Einsatz:** ${amt} Coins\n\n${won?`✅ +${amt} Coins!${bonusXP>0?`\n🎁 **Bonus:** +${bonusXP} XP!`:''}`:`❌ -${amt} Coins!`}\n\n**Balance:** ${newC} Coins`)
    .setThumbnail(i.user.displayAvatarURL()).setImage(IMAGE);
  
  log(i.client,"INFO","Coinflip",`User: ${i.user.tag}\nEinsatz: ${amt}\nErgebnis: ${won?"WIN":"LOSS"}${bonusXP>0?`\nBonus: ${bonusXP} XP`:''}\nBalance: ${newC}`,i.user);
  return anim.edit({content:null,embeds:[e]});
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
  const d=await getUser(t.id);
  
  // User in DB erstellen falls nicht existiert
  if(!d.user_id) {
    await saveUser(t.id,0,0,amt,0,0,null);
  } else {
    await saveUser(t.id,d.xp,d.level,amt,d.total_xp,d.xp_boost,d.xp_boost_until);
  }
  
  log(i.client,"COINS","Coins editiert",`Ziel: ${t.tag}\nVorher: ${d.coins} → ${amt}`,i.user);
  return i.editReply(`✅ Coins von **${t.username}** auf **${amt}** gesetzt.`);
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
  if(n==="betlabranking"){betlabranking(i);return true;}
  if(n==="betlabeditcoins"){betlabeditcoins(i);return true;}
  if(n==="betlabeditxp"){betlabeditxp(i);return true;}
  return false;
}

module.exports={handleMessage,handleReaction,handleCommand};
