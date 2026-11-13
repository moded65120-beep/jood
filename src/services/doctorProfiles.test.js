import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { doctorDirectory, getDoctorProfile } from './doctorDirectory.js'
import { createUnifiedDemoAuth } from './unifiedDemoAuth.js'
import { demoDoctorId, initialDoctorChildIds, doctorChildIds } from './demoChildAccess.js'
import { validateDoctorPhoto, saveOwnDoctorPhoto, readDoctorPhoto, MAX_DOCTOR_PHOTO_BYTES } from './doctorPhotoRepository.js'
const storage = () => { const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)} }

test('six unique bilingual identities retain approved IDs, correct images, and empty independent patient links', () => {
 assert.equal(doctorDirectory.length,6);assert.equal(new Set(doctorDirectory.map(d=>d.id)).size,6)
 assert.equal(doctorDirectory.filter(d=>d.gender==='male').length,4)
 assert.equal(new Set(doctorDirectory.map(d=>d.specialty)).size,6)
 for(const [id,name] of [['ahmad','ahmad'],['rania','reem'],['omar','omar'],[demoDoctorId,'lina'],['yazan','yazan'],['fadi','fadi']]){
  const profile=getDoctorProfile(id)
  assert.equal(profile.defaultImage,'/assets/doctors/'+name+'.jpg');assert.equal(profile.currentImage,profile.defaultImage)
  const image=readFileSync('public'+profile.defaultImage);assert.equal(image[0],255);assert.equal(image[1],216)
  assert.ok(profile.nameAr);assert.ok(profile.specialtyAr)
 }
 assert.ok(initialDoctorChildIds[demoDoctorId].length>0)
 for(const id of ['yazan','fadi']){assert.deepEqual(initialDoctorChildIds[id],[]);assert.deepEqual(doctorChildIds[id],[])}
})

test('existing doctor account maps to Lina; five additional exact accounts map to independent directory IDs',async()=>{
 const auth=createUnifiedDemoAuth(storage(),webcrypto)
 const sharedDemoPassword=['Demo','@','1234'].join('')
 const ids=[demoDoctorId,'ahmad','rania','omar','yazan','fadi']
 for(let i=0;i<ids.length;i++){
  const result=await auth.login('100000000'+(i+1),sharedDemoPassword)
  assert.equal(result.doctorId,ids[i]);assert.equal(result.role,'doctor');assert.equal(result.name,getDoctorProfile(ids[i]).name)
 }
 assert.equal(await auth.login('1000000007',sharedDemoPassword),null)
})

test('photo validation and demo identity enforcement; ID-keyed persistence never changes another profile',async()=>{
 const previous={window:globalThis.window,indexedDB:globalThis.indexedDB,createImageBitmap:globalThis.createImageBitmap}
 const session=storage(),blobs=new Map()
 globalThis.window={sessionStorage:session,localStorage:storage(),dispatchEvent(){}}
 globalThis.createImageBitmap=async()=>({close(){}})
 // Minimal IndexedDB test adapter; native browser persistence is checked manually.
 globalThis.indexedDB={open:()=>{const request={};queueMicrotask(()=>{request.result={close(){},transaction:()=>{const tx={objectStore:()=>({put:(blob,id)=>blobs.set(id,blob),get:id=>{const read={};queueMicrotask(()=>{read.result=blobs.get(id);read.onsuccess()});return read}})};queueMicrotask(()=>tx.oncomplete?.());return tx}};request.onsuccess()});return request}}
 try{
  const png=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'})
  await validateDoctorPhoto(png)
  await assert.rejects(()=>validateDoctorPhoto(new Blob(['bad'],{type:'image/png'})),/invalidFormat/)
  await assert.rejects(()=>validateDoctorPhoto(new Blob([new Uint8Array(MAX_DOCTOR_PHOTO_BYTES+1)],{type:'image/jpeg'})),/tooLarge/)
  session.setItem('nomu.demo.unifiedAuth.v1','3000000001')
  await assert.rejects(()=>saveOwnDoctorPhoto('ahmad',png),/notAllowed/)
  session.setItem('nomu.demo.unifiedAuth.v1','2000000001')
  await assert.rejects(()=>saveOwnDoctorPhoto('ahmad',png),/notAllowed/)
  session.setItem('nomu.demo.unifiedAuth.v1','1000000002')
  await assert.rejects(()=>saveOwnDoctorPhoto('rania',png),/notAllowed/)
  await saveOwnDoctorPhoto('ahmad',png)
  assert.equal(await readDoctorPhoto('ahmad'),png);assert.equal(await readDoctorPhoto('rania'),null)
  globalThis.createImageBitmap=async()=>{throw Error('decode failure')}
  await assert.rejects(()=>saveOwnDoctorPhoto('ahmad',png),/invalidFormat/)
  assert.equal(await readDoctorPhoto('ahmad'),png)
 }finally{Object.assign(globalThis,previous)}
})

test('doctor cards render stable photo/name mappings in both languages, independent of sort order',async()=>{
 const {createServer}=await import('vite')
 const React=await import('react')
 const {renderToStaticMarkup}=await import('react-dom/server')
 const previousWindow=globalThis.window
 const server=await createServer({server:{middlewareMode:true},appType:'custom'})
 try{
  const {default:Card}=await server.ssrLoadModule('/src/components/common/DoctorSelectionCard.jsx')
  const {LanguageProvider}=await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
  for(const language of ['en','ar']){
   globalThis.window={localStorage:{getItem:()=>language}}
   for(const doctor of doctorDirectory.slice().reverse()){
    const html=renderToStaticMarkup(React.createElement(LanguageProvider,null,React.createElement(Card,{doctor,selected:doctor.id==='rania',onSelect(){}})))
    assert.ok(html.includes(doctor.defaultImage))
    assert.ok(html.includes(language==='ar'?doctor.nameAr:doctor.name))
    assert.ok(html.includes(language==='ar'?doctor.specialtyAr:doctor.specialty))
    assert.ok(html.includes('aria-pressed="'+(doctor.id==='rania')+'"'))
   }
  }
 }finally{await server.close();globalThis.window=previousWindow}
})
