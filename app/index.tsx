import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Plus, MessageCircle, Phone, Users, CircleDot, Settings, CheckCheck, Camera, SlidersHorizontal } from "lucide-react-native";
import type { User } from "firebase/auth";
import { observeAuth } from "../src/lib/auth";
import { listenToConversations, listenToProfile, type TsiConversation, type TsiProfile } from "../src/lib/firestore";

type Chat = { id: string; name: string; message: string; time: string; unread: number; group: boolean; color: string; initials: string; sent?: boolean };
const AVATAR_COLORS = ["#F5D8CB", "#DCE7FF", "#F3E4B9", "#D8EDE3", "#E8DDF7", "#F6DCE7", "#D9EAF2"];

function initials(name: string) {
  return name.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "T";
}

function formatConversationTime(value: unknown) {
  if (!value || typeof value !== "object" || !("toDate" in value) || typeof value.toDate !== "function") return "";
  const date = value.toDate();
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export default function HomeScreen() {
 const router = useRouter();
 const [tab,setTab]=useState("Messages");
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Tous");
 const [selected,setSelected]=useState("");
 const [user,setUser]=useState<User|null>(null);
 const [conversations,setConversations]=useState<TsiConversation[]>([]);
 const [profiles,setProfiles]=useState<Record<string,TsiProfile>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");

 useEffect(() => {
   let stopConversations: (() => void) | undefined;
   let profileStops: Record<string, () => void> = {};
   let active = true;
   let stopAuth: (() => void) | undefined;
   try {
     stopAuth = observeAuth((currentUser) => {
       if (!active) return;
       setUser(currentUser);
       stopConversations?.();
       Object.values(profileStops).forEach((stop) => stop());
       profileStops = {};
       setConversations([]);
       setProfiles({});
       if (!currentUser) { setLoading(false); return; }
       setLoading(true);
       setError("");
       stopConversations = listenToConversations(currentUser.uid, (items) => {
         if (!active) return;
         setConversations(items);
         setLoading(false);
         const memberIds = [...new Set(items.flatMap((item) => item.memberIds).filter((id) => id !== currentUser.uid))];
         for (const uid of memberIds) {
           if (!profileStops[uid]) {
             profileStops[uid] = listenToProfile(uid, (profile) => {
               if (!active) return;
               setProfiles((current) => {
                 if (!profile) return current;
                 return { ...current, [uid]: profile };
               });
             }, () => setError("Impossible de charger certains profils."));
           }
         }
         for (const uid of Object.keys(profileStops)) {
           if (!memberIds.includes(uid)) {
             profileStops[uid]();
             delete profileStops[uid];
             setProfiles((current) => { const next = { ...current }; delete next[uid]; return next; });
           }
         }
       }, () => { if (active) { setError("Impossible de synchroniser les conversations. Vérifiez les règles Firestore."); setLoading(false); } });
     });
   } catch {
     setError("Firebase n'est pas configuré. Ajoutez les clés du projet dans le fichier .env.");
     setLoading(false);
   }
   return () => {
     active = false;
     stopAuth?.();
     stopConversations?.();
     Object.values(profileStops).forEach((stop) => stop());
   };
 }, []);

 const chats = useMemo<Chat[]>(() => conversations.map((conversation, index) => {
   const otherIds = conversation.memberIds.filter((id) => id !== user?.uid);
   const otherProfiles = otherIds.map((id) => profiles[id]).filter(Boolean);
   const isGroup = conversation.memberIds.length > 2;
   const name = conversation.title || (isGroup ? otherProfiles.map((p) => p.displayName).slice(0, 3).join(", ") : otherProfiles[0]?.displayName) || "Nouvelle conversation";
   return {
     id: conversation.id,
     name,
     message: conversation.lastMessage || "Démarrer la conversation",
     time: formatConversationTime(conversation.lastMessageAt),
     unread: 0,
     group: isGroup,
     color: AVATAR_COLORS[index % AVATAR_COLORS.length],
     initials: initials(name),
   };
 }), [conversations, profiles, user?.uid]);

 const filtered=useMemo(()=>chats.filter(c=>(c.name.toLowerCase().includes(query.toLowerCase())||c.message.toLowerCase().includes(query.toLowerCase()))&&(filter==="Tous"||(filter==="Non lus"&&c.unread>0)||(filter==="Groupes"&&c.group))),[chats,query,filter]);
 const tabs=[{label:"Messages",icon:MessageCircle},{label:"Appels",icon:Phone},{label:"Communautés",icon:Users},{label:"Statuts",icon:CircleDot}];
 return <SafeAreaView style={s.safe}>
  <View style={s.header}>
   <View><Text style={s.brand}>tsi<Text style={s.brandDot}>.</Text></Text><Text style={s.subtitle}>Restez proches.</Text></View>
   <View style={s.headerActions}>
    <Pressable style={s.iconButton} onPress={()=>setTab("Statuts")}><Camera size={21} color="#26364C"/></Pressable>
    <Pressable style={s.avatarMe}><Text style={s.avatarMeText}>{initials(user?.displayName || "TS")}</Text><View style={s.onlineDot}/></Pressable>
   </View>
  </View>
  <View style={s.titleRow}><View><Text style={s.pageTitle}>{tab==="Messages"?"Messages":tab}</Text><Text style={s.pageSub}>{tab==="Messages"?"Vos conversations, au même endroit":"Gardez le lien avec vos proches"}</Text></View><Pressable style={s.newButton} onPress={() => router.push("/new-chat" as never)}><Plus size={19} color="#FFFFFF"/><Text style={s.newButtonText}>Nouveau</Text></Pressable></View>
  <View style={s.search}><Search size={19} color="#8B98A9"/><TextInput value={query} onChangeText={setQuery} placeholder="Rechercher une conversation" placeholderTextColor="#98A3B2" style={s.searchInput}/><SlidersHorizontal size={18} color="#8794A5"/></View>
  <View style={s.filters}>{["Tous","Non lus","Groupes"].map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={[s.filterPill,filter===f&&s.filterActive]}><Text style={[s.filterText,filter===f&&s.filterTextActive]}>{f}</Text></Pressable>)}</View>
  <View style={s.sectionHead}><Text style={s.sectionTitle}>Vos échanges</Text><Text style={s.seeAll}>Synchronisés en direct</Text></View>
  <View style={s.listHead}><Text style={s.sectionTitle}>Récents</Text><Text style={s.count}>{filtered.length} discussions</Text></View>
  {loading ? <View style={{padding:32,alignItems:"center"}}><ActivityIndicator color="#238C78"/><Text style={{marginTop:10,color:"#8793A3",fontSize:12}}>Chargement des conversations…</Text></View> : error ? <View style={{padding:20,backgroundColor:"#FFF1F0",borderRadius:14}}><Text style={{color:"#A13D36",fontSize:12}}>{error}</Text></View> : <FlatList data={filtered} keyExtractor={item=>item.id} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={{padding:28,alignItems:"center"}}><MessageCircle size={28} color="#9AA5B2"/><Text style={{marginTop:10,color:"#526276",fontSize:13,fontWeight:"700"}}>{query ? "Aucun résultat" : "Aucune conversation pour le moment"}</Text><Text style={{marginTop:5,color:"#98A3B0",fontSize:11,textAlign:"center"}}>Appuyez sur « Nouveau » pour commencer à discuter.</Text></View>} renderItem={({item})=><Pressable onPress={()=>{setSelected(item.id);router.push({pathname:"/chat/[id]",params:{id:item.id,name:item.name}});}} style={[s.chatRow,selected===item.id&&s.chatSelected]}>
   <View style={[s.chatAvatar,{backgroundColor:item.color}]}><Text style={s.chatInitial}>{item.initials}</Text></View>
   <View style={s.chatMain}><View style={s.chatTop}><Text style={s.chatName}>{item.name}</Text><Text style={s.chatTime}>{item.time}</Text></View><View style={s.chatBottom}><View style={s.previewLine}><Text numberOfLines={1} style={s.chatPreview}>{item.message}</Text></View></View></View>
  </Pressable>}/>}
  <View style={s.bottomBar}>{tabs.map(t=>{const Icon=t.icon;const active=tab===t.label;return <Pressable key={t.label} onPress={()=>setTab(t.label)} style={s.tab}><View style={[s.tabIcon,active&&s.tabIconActive]}><Icon size={20} color={active?"#FFFFFF":"#8794A5"}/></View><Text style={[s.tabLabel,active&&s.tabLabelActive]}>{t.label}</Text></Pressable>})}<Pressable onPress={()=>setTab("Paramètres")} style={s.tab}><View style={s.tabIcon}><Settings size={20} color="#8794A5"/></View><Text style={s.tabLabel}>Réglages</Text></Pressable></View>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F6F8FB",paddingHorizontal:20,paddingTop:Platform.OS==="android"?8:2},
 header:{height:62,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 brand:{fontSize:34,fontWeight:"900",letterSpacing:-2.2,color:"#14243A"},brandDot:{color:"#2D9D83"},subtitle:{fontSize:11,color:"#8995A5",marginTop:-3,letterSpacing:.3},
 headerActions:{flexDirection:"row",alignItems:"center",gap:12},iconButton:{width:42,height:42,borderRadius:15,backgroundColor:"#FFFFFF",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"#EDF0F4"},
 avatarMe:{width:40,height:40,borderRadius:15,backgroundColor:"#DCE8F2",alignItems:"center",justifyContent:"center"},avatarMeText:{fontSize:16,fontWeight:"800",color:"#24405B"},onlineDot:{position:"absolute",right:-1,bottom:-1,width:12,height:12,borderRadius:6,backgroundColor:"#2BA783",borderWidth:2,borderColor:"#F6F8FB"},
 titleRow:{marginTop:25,marginBottom:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},pageTitle:{fontSize:29,fontWeight:"800",letterSpacing:-.8,color:"#17283F"},pageSub:{fontSize:12,color:"#8793A3",marginTop:4},newButton:{height:42,backgroundColor:"#18334C",borderRadius:14,paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:6},newButtonText:{color:"#FFF",fontSize:12,fontWeight:"700"},
 search:{height:50,backgroundColor:"#FFFFFF",borderRadius:16,borderWidth:1,borderColor:"#E9EEF3",paddingHorizontal:15,flexDirection:"row",alignItems:"center",gap:10},searchInput:{flex:1,fontSize:13,color:"#24364B",paddingVertical:0},
 filters:{flexDirection:"row",gap:8,marginTop:14,marginBottom:22},filterPill:{paddingHorizontal:15,height:32,borderRadius:11,justifyContent:"center",backgroundColor:"#EDF1F5"},filterActive:{backgroundColor:"#DCEFEA"},filterText:{fontSize:11,fontWeight:"600",color:"#788697"},filterTextActive:{color:"#187B68"},
 sectionHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:13},sectionTitle:{fontSize:14,fontWeight:"800",color:"#24364B",letterSpacing:-.2},seeAll:{fontSize:11,color:"#238C78",fontWeight:"700"},
 stories:{flexDirection:"row",justifyContent:"space-between",marginBottom:24},story:{alignItems:"center",width:58},storyRing:{width:55,height:55,borderRadius:20,borderWidth:2,borderColor:"#2A9D83",alignItems:"center",justifyContent:"center"},storyRingAdd:{borderColor:"#D8E0E8",borderStyle:"dashed"},storyAvatar:{width:45,height:45,borderRadius:16,alignItems:"center",justifyContent:"center"},storyInitial:{fontSize:13,fontWeight:"800",color:"#33475C"},storyPlus:{position:"absolute",right:-3,bottom:-3,width:19,height:19,borderRadius:7,backgroundColor:"#2A9D83",alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:"#F6F8FB"},storyName:{fontSize:10,color:"#758294",marginTop:6},
 listHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:7},count:{fontSize:10,color:"#9AA5B2"},
 listContent:{paddingBottom:15},chatRow:{height:77,flexDirection:"row",alignItems:"center",gap:12,borderBottomWidth:1,borderBottomColor:"#EDF1F4",paddingHorizontal:5},chatSelected:{backgroundColor:"#EFF5F4",borderRadius:16,borderBottomColor:"transparent",paddingHorizontal:9},chatAvatar:{width:51,height:51,borderRadius:18,alignItems:"center",justifyContent:"center"},chatInitial:{fontSize:14,fontWeight:"800",color:"#30465D"},chatOnline:{position:"absolute",right:-1,bottom:0,width:12,height:12,borderRadius:6,backgroundColor:"#2A9D83",borderWidth:2,borderColor:"#F6F8FB"},
 chatMain:{flex:1},chatTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:7},chatName:{fontSize:13,fontWeight:"700",color:"#26384D"},chatTime:{fontSize:10,color:"#98A3B0"},chatTimeUnread:{color:"#238C78",fontWeight:"800"},chatBottom:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},previewLine:{flexDirection:"row",alignItems:"center",gap:4,flex:1},chatPreview:{fontSize:11,color:"#8793A1",flexShrink:1},chatPreviewUnread:{color:"#526276",fontWeight:"600"},unread:{minWidth:19,height:19,borderRadius:7,backgroundColor:"#2A9D83",alignItems:"center",justifyContent:"center",paddingHorizontal:5},unreadText:{fontSize:10,fontWeight:"800",color:"#FFF"},
 bottomBar:{height:72,backgroundColor:"#FFFFFF",borderRadius:22,marginBottom:5,flexDirection:"row",alignItems:"center",justifyContent:"space-around",borderWidth:1,borderColor:"#EDF1F4",shadowColor:"#13283D",shadowOpacity:.05,shadowRadius:14,shadowOffset:{width:0,height:-4}},tab:{alignItems:"center",justifyContent:"center",gap:4,minWidth:54},tabIcon:{width:34,height:30,borderRadius:11,alignItems:"center",justifyContent:"center"},tabIconActive:{backgroundColor:"#183B52"},tabBadge:{position:"absolute",right:1,top:1,width:7,height:7,borderRadius:4,backgroundColor:"#2A9D83",borderWidth:1,borderColor:"#FFF"},tabLabel:{fontSize:9,color:"#96A1AE",fontWeight:"600"},tabLabelActive:{color:"#1C3B51",fontWeight:"800"}
});
