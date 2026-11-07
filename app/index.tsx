import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, TextInput, Pressable, FlatList, Image, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Plus, MessageCircle, Phone, Users, CircleDot, Settings, Check, CheckCheck, Camera, SlidersHorizontal } from "lucide-react-native";

type Chat = { id:string; name:string; message:string; time:string; unread:number; online?:boolean; group?:boolean; color:string; initials:string; sent?:boolean; read?:boolean };
const CHATS:Chat[] = [
 {id:"1",name:"Aïcha Koné",message:"Tu as reçu les photos ? 😍",time:"10:42",unread:2,online:true,color:"#F5D8CB",initials:"AK",read:true},
 {id:"2",name:"Équipe TSI",message:"Moussa : On se retrouve à 18h",time:"09:58",unread:5,group:true,color:"#DCE7FF",initials:"TS"},
 {id:"3",name:"Maman ❤️",message:"D'accord mon enfant, merci.",time:"Hier",unread:0,color:"#F3E4B9",initials:"M",read:true},
 {id:"4",name:"Yannick",message:"Appel vocal manqué",time:"Hier",unread:0,color:"#D8EDE3",initials:"Y"},
 {id:"5",name:"Les amis du quartier",message:"Vous : Je suis en route",time:"Hier",unread:0,group:true,color:"#E8DDF7",initials:"AQ",sent:true,read:true},
 {id:"6",name:"Fatou Traoré",message:"Merci beaucoup !",time:"Mar.",unread:0,color:"#F6DCE7",initials:"FT",read:true},
 {id:"7",name:"Kader",message:"😂😂😂",time:"Lun.",unread:0,color:"#D9EAF2",initials:"K"}
];
const STORIES = [{name:"Votre statut",initials:"+",color:"#DCE5F5",add:true},{name:"Aïcha",initials:"AK",color:"#F5D8CB"},{name:"Moussa",initials:"M",color:"#DCE7FF"},{name:"Fatou",initials:"FT",color:"#F6DCE7"},{name:"Yannick",initials:"Y",color:"#D8EDE3"}];

export default function HomeScreen() {
 const router = useRouter();
 const [tab,setTab]=useState("Messages");
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Tous");
 const [selected,setSelected]=useState("1");
 const filtered=useMemo(()=>CHATS.filter(c=>(c.name.toLowerCase().includes(query.toLowerCase())||c.message.toLowerCase().includes(query.toLowerCase()))&&(filter==="Tous"||(filter==="Non lus"&&c.unread>0)||(filter==="Groupes"&&c.group))),[query,filter]);
 const tabs=[{label:"Messages",icon:MessageCircle},{label:"Appels",icon:Phone},{label:"Communautés",icon:Users},{label:"Statuts",icon:CircleDot}];
 return <SafeAreaView style={s.safe}>
  <View style={s.header}>
   <View><Text style={s.brand}>tsi<Text style={s.brandDot}>.</Text></Text><Text style={s.subtitle}>Restez proches.</Text></View>
   <View style={s.headerActions}>
    <Pressable style={s.iconButton} onPress={()=>setTab("Statuts")}><Camera size={21} color="#26364C"/></Pressable>
    <Pressable style={s.avatarMe}><Text style={s.avatarMeText}>K</Text><View style={s.onlineDot}/></Pressable>
   </View>
  </View>
  <View style={s.titleRow}><View><Text style={s.pageTitle}>{tab==="Messages"?"Messages":tab}</Text><Text style={s.pageSub}>{tab==="Messages"?"Vos conversations, au même endroit":"Gardez le lien avec vos proches"}</Text></View><Pressable style={s.newButton}><Plus size={19} color="#FFFFFF"/><Text style={s.newButtonText}>Nouveau</Text></Pressable></View>
  <View style={s.search}><Search size={19} color="#8B98A9"/><TextInput value={query} onChangeText={setQuery} placeholder="Rechercher une conversation" placeholderTextColor="#98A3B2" style={s.searchInput}/><SlidersHorizontal size={18} color="#8794A5"/></View>
  <View style={s.filters}>{["Tous","Non lus","Groupes"].map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={[s.filterPill,filter===f&&s.filterActive]}><Text style={[s.filterText,filter===f&&s.filterTextActive]}>{f}</Text></Pressable>)}</View>
  <View style={s.sectionHead}><Text style={s.sectionTitle}>Statuts récents</Text><Text style={s.seeAll}>Voir tout</Text></View>
  <View style={s.stories}>{STORIES.map((story,i)=><Pressable key={story.name} style={s.story}><View style={[s.storyRing,story.add&&s.storyRingAdd]}><View style={[s.storyAvatar,{backgroundColor:story.color}]}><Text style={s.storyInitial}>{story.initials}</Text></View>{story.add&&<View style={s.storyPlus}><Plus size={12} color="#FFF"/></View>}</View><Text numberOfLines={1} style={s.storyName}>{story.name}</Text></Pressable>)}</View>
  <View style={s.listHead}><Text style={s.sectionTitle}>Récents</Text><Text style={s.count}>{filtered.length} discussions</Text></View>
  <FlatList data={filtered} keyExtractor={item=>item.id} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false} renderItem={({item})=><Pressable onPress={()=>{setSelected(item.id);router.push({pathname:"/chat/[id]",params:{id:item.id,name:item.name}});}} style={[s.chatRow,selected===item.id&&s.chatSelected]}>
   <View style={[s.chatAvatar,{backgroundColor:item.color}]}><Text style={s.chatInitial}>{item.initials}</Text>{item.online&&<View style={s.chatOnline}/>}</View>
   <View style={s.chatMain}><View style={s.chatTop}><Text style={s.chatName}>{item.name}</Text><Text style={[s.chatTime,item.unread>0&&s.chatTimeUnread]}>{item.time}</Text></View><View style={s.chatBottom}><View style={s.previewLine}>{item.sent&&<CheckCheck size={15} color="#2A9D83"/>}{item.read&&item.sent!==true&&<CheckCheck size={15} color="#2A9D83"/>}<Text numberOfLines={1} style={[s.chatPreview,item.unread>0&&s.chatPreviewUnread]}>{item.message}</Text></View>{item.unread>0&&<View style={s.unread}><Text style={s.unreadText}>{item.unread}</Text></View>}</View></View>
  </Pressable>}/>
  <View style={s.bottomBar}>{tabs.map(t=>{const Icon=t.icon;const active=tab===t.label;return <Pressable key={t.label} onPress={()=>setTab(t.label)} style={s.tab}><View style={[s.tabIcon,active&&s.tabIconActive]}><Icon size={20} color={active?"#FFFFFF":"#8794A5"}/>{t.label==="Messages"&&<View style={s.tabBadge}/>}</View><Text style={[s.tabLabel,active&&s.tabLabelActive]}>{t.label}</Text></Pressable>})}<Pressable onPress={()=>setTab("Paramètres")} style={s.tab}><View style={s.tabIcon}><Settings size={20} color="#8794A5"/></View><Text style={s.tabLabel}>Réglages</Text></Pressable></View>
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
 chatMain:{flex:1},chatTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:7},chatName:{fontSize:13,fontWeight:"750",color:"#26384D"},chatTime:{fontSize:10,color:"#98A3B0"},chatTimeUnread:{color:"#238C78",fontWeight:"800"},chatBottom:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},previewLine:{flexDirection:"row",alignItems:"center",gap:4,flex:1},chatPreview:{fontSize:11,color:"#8793A1",flexShrink:1},chatPreviewUnread:{color:"#526276",fontWeight:"600"},unread:{minWidth:19,height:19,borderRadius:7,backgroundColor:"#2A9D83",alignItems:"center",justifyContent:"center",paddingHorizontal:5},unreadText:{fontSize:10,fontWeight:"800",color:"#FFF"},
 bottomBar:{height:72,backgroundColor:"#FFFFFF",borderRadius:22,marginBottom:5,flexDirection:"row",alignItems:"center",justifyContent:"space-around",borderWidth:1,borderColor:"#EDF1F4",shadowColor:"#13283D",shadowOpacity:.05,shadowRadius:14,shadowOffset:{width:0,height:-4}},tab:{alignItems:"center",justifyContent:"center",gap:4,minWidth:54},tabIcon:{width:34,height:30,borderRadius:11,alignItems:"center",justifyContent:"center"},tabIconActive:{backgroundColor:"#183B52"},tabBadge:{position:"absolute",right:1,top:1,width:7,height:7,borderRadius:4,backgroundColor:"#2A9D83",borderWidth:1,borderColor:"#FFF"},tabLabel:{fontSize:9,color:"#96A1AE",fontWeight:"600"},tabLabelActive:{color:"#1C3B51",fontWeight:"800"}
});
