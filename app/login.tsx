import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { loginWithEmail, registerWithEmail } from "../src/lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [mode,setMode] = useState<"login"|"register">("login");
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (mode === "register") await registerWithEmail(email,password,name);
      else await loginWithEmail(email,password);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible. Réessayez.");
    } finally { setBusy(false); }
  };
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.wrap} behavior={Platform.OS==="ios"?"padding":undefined}>
    <View style={s.logo}><Text style={s.brand}>tsi<Text style={s.dot}>.</Text></Text><Text style={s.tag}>Restez proches.</Text></View>
    <View style={s.card}><Text style={s.title}>{mode==="login"?"Heureux de vous revoir":"Bienvenue sur TSI"}</Text><Text style={s.sub}>{mode==="login"?"Connectez-vous pour retrouver vos conversations.":"Créez votre compte et restez en contact."}</Text>
      {mode==="register"&&<TextInput value={name} onChangeText={setName} placeholder="Votre nom" placeholderTextColor="#98A4B2" style={s.input} autoCapitalize="words"/>}
      <TextInput value={email} onChangeText={setEmail} placeholder="Adresse e-mail" placeholderTextColor="#98A4B2" style={s.input} autoCapitalize="none" keyboardType="email-address"/>
      <TextInput value={password} onChangeText={setPassword} placeholder="Mot de passe (8 caractères minimum)" placeholderTextColor="#98A4B2" style={s.input} secureTextEntry/>
      {!!error&&<Text style={s.error}>{error}</Text>}
      <Pressable onPress={submit} disabled={busy} style={[s.submit,busy&&{opacity:.65}]}>{busy?<ActivityIndicator color="#FFF"/>:<Text style={s.submitText}>{mode==="login"?"Se connecter":"Créer mon compte"}</Text>}</Pressable>
      <Pressable onPress={()=>{setMode(mode==="login"?"register":"login");setError("");}}><Text style={s.switch}>{mode==="login"?"Nouveau sur TSI ? Créer un compte":"Déjà inscrit ? Se connecter"}</Text></Pressable>
    </View>
    <Text style={s.foot}>Vos échanges commencent ici.</Text>
  </KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F4F7FA"},wrap:{flex:1,justifyContent:"center",paddingHorizontal:24},logo:{alignItems:"center",marginBottom:38},brand:{fontSize:52,fontWeight:"900",letterSpacing:-4,color:"#14243A"},dot:{color:"#2D9D83"},tag:{fontSize:12,color:"#8995A5",marginTop:-4},card:{backgroundColor:"#FFF",borderRadius:25,padding:23,borderWidth:1,borderColor:"#E9EEF3",shadowColor:"#1C344A",shadowOpacity:.06,shadowRadius:22,shadowOffset:{width:0,height:10}},title:{fontSize:23,fontWeight:"800",color:"#17283F",letterSpacing:-.5},sub:{fontSize:12,color:"#8793A3",lineHeight:18,marginTop:7,marginBottom:22},input:{height:51,borderRadius:14,borderWidth:1,borderColor:"#E7ECF1",paddingHorizontal:14,marginBottom:11,fontSize:13,color:"#26384D",backgroundColor:"#FBFCFD"},error:{color:"#C24D4D",fontSize:11,lineHeight:16,marginBottom:10},submit:{height:51,borderRadius:15,backgroundColor:"#183B52",alignItems:"center",justifyContent:"center",marginTop:5},submitText:{color:"#FFF",fontSize:13,fontWeight:"800"},switch:{textAlign:"center",fontSize:12,color:"#238C78",fontWeight:"700",marginTop:20},foot:{textAlign:"center",fontSize:11,color:"#A1ABB6",marginTop:25}});
