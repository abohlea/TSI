import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Phone, Video, MoreVertical, Paperclip, Camera, Mic, Send, CheckCheck } from "lucide-react-native";
import { observeAuth } from "../../src/lib/auth";
import { listenToMessages, sendTextMessage, type TsiMessage } from "../../src/lib/firestore";

type Message={id:string;text:string;time:string;mine:boolean};
export default function ConversationScreen(){
 const router=useRouter();const params=useLocalSearchParams<{id:string;name:string}>();
 const name=params.name||"Conversation";
 const [draft,setDraft]=useState("");
 const [uid,setUid]=useState("");
 const [messages,setMessages]=useState<Message[]>([]);
 const [sending,setSending]=useState(false);
 const [sendError,setSendError]=useState("");
 useEffect(()=>observeAuth(user=>setUid(user?.uid||"")),[]);
 useEffect(()=>{
  if(!params.id||!uid)return;
  return listenToMessages(params.id,(items:TsiMessage[])=>setMessages(items.map(item=>({id:item.id,text:item.text||"",time:item.createdAt&&typeof (item.createdAt as {toDate?:()=>Date}).toDate==="function"?(item.createdAt as {toDate:()=>Date}).toDate().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"",mine:item.senderId===uid}))),error=>setSendError(error.message));
 },[params.id,uid]);
 const send=async()=>{const text=draft.trim();if(!text||!uid||sending)return;setSending(true);setSendError("");try{await sendTextMessage(params.id,uid,text);setDraft("");}catch(e){setSendError(e instanceof Error?e.message:"Envoi impossible.");}finally{setSending(false);}};
 return <SafeAreaView style={s.safe}><View style={s.header}>
  <Pressable onPress={()=>router.back()} style={s.back}><ArrowLeft size={22} color="#18334C"/></Pressable>
  <View style={s.avatar}><Text style={s.avatarText}>{name.slice(0,1).toUpperCase()}</Text><View style={s.online}/></View>
  <View style={s.person}><Text style={s.name}>{name}</Text><Text style={s.presence}>en ligne</Text></View>
  <Pressable style={s.action}><Phone size={20} color="#24445B"/></Pressable><Pressable style={s.action}><Video size={21} color="#24445B"/></Pressable><Pressable style={s.action}><MoreVertical size={20} color="#24445B"/></Pressable>
 </View>
 <View style={s.encryption}><Text style={s.lock}>ℹ️</Text><Text style={s.encryptionText}>Messages synchronisés avec Firestore. Le chiffrement de bout en bout n’est pas encore disponible.</Text></View>
 <FlatList data={messages} keyExtractor={m=>m.id} contentContainerStyle={s.messages} showsVerticalScrollIndicator={false} renderItem={({item})=><View style={[s.bubble,item.mine?s.mine:s.theirs]}><Text style={[s.message,item.mine&&s.mineText]}>{item.text}</Text><View style={s.meta}><Text style={[s.time,item.mine&&s.mineTime]}>{item.time}</Text>{item.mine&&<CheckCheck size={14} color="#BFE7DB"/>}</View></View>}/>
 <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined}><View style={s.composer}>
  <Pressable style={s.attach}><Paperclip size={21} color="#718094"/></Pressable><TextInput value={draft} onChangeText={setDraft} placeholder="Écrire un message…" placeholderTextColor="#9AA5B2" style={s.input} multiline maxLength={2000}/>
  {draft.trim()?<Pressable onPress={send} disabled={sending} style={s.send}><Send size={18} color="#FFF"/></Pressable>:<><Pressable style={s.attach}><Camera size={20} color="#718094"/></Pressable><Pressable style={s.send}><Mic size={19} color="#FFF"/></Pressable></>}
 </View></KeyboardAvoidingView>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F4F7FA"},header:{height:65,backgroundColor:"#FFF",flexDirection:"row",alignItems:"center",paddingHorizontal:12,gap:9,borderBottomWidth:1,borderBottomColor:"#EAF0F4"},
 back:{width:32,height:40,alignItems:"center",justifyContent:"center"},avatar:{width:39,height:39,borderRadius:14,backgroundColor:"#DCE8F2",alignItems:"center",justifyContent:"center"},avatarText:{fontWeight:"800",fontSize:15,color:"#29465E"},online:{position:"absolute",width:10,height:10,borderRadius:5,right:-1,bottom:0,backgroundColor:"#2A9D83",borderWidth:2,borderColor:"#FFF"},
 person:{flex:1},name:{fontSize:14,fontWeight:"800",color:"#20364B"},presence:{fontSize:10,color:"#29977F",marginTop:2},action:{width:32,height:40,alignItems:"center",justifyContent:"center"},
 encryption:{marginTop:14,marginHorizontal:35,backgroundColor:"#E7F1EF",padding:11,borderRadius:12,flexDirection:"row",gap:7,alignItems:"center"},lock:{fontSize:12},encryptionText:{flex:1,textAlign:"center",fontSize:10,lineHeight:15,color:"#55736D"},
 messages:{paddingHorizontal:16,paddingTop:22,paddingBottom:20,gap:12},bubble:{maxWidth:"82%",paddingHorizontal:14,paddingTop:10,paddingBottom:7,borderRadius:17},mine:{alignSelf:"flex-end",backgroundColor:"#183B52",borderBottomRightRadius:5},theirs:{alignSelf:"flex-start",backgroundColor:"#FFF",borderBottomLeftRadius:5,borderWidth:1,borderColor:"#EDF1F4"},message:{fontSize:14,lineHeight:20,color:"#2A3D52"},mineText:{color:"#FFF"},meta:{flexDirection:"row",justifyContent:"flex-end",alignItems:"center",gap:4,marginTop:4},time:{fontSize:9,color:"#9AA5B2"},mineTime:{color:"#B8D2D0"},
 composer:{marginHorizontal:12,marginBottom:8,minHeight:54,backgroundColor:"#FFF",borderRadius:18,borderWidth:1,borderColor:"#E8EDF2",flexDirection:"row",alignItems:"center",paddingHorizontal:7,paddingVertical:5,gap:4},attach:{width:34,height:40,alignItems:"center",justifyContent:"center"},input:{flex:1,maxHeight:100,minHeight:38,fontSize:13,color:"#26384D",paddingHorizontal:6,paddingTop:10},send:{width:40,height:40,borderRadius:14,backgroundColor:"#218C78",alignItems:"center",justifyContent:"center"}
});
