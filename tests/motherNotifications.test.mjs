import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'

test('bell toggle, outside click, Escape, read-all and notification navigation in English/Arabic', async () => {
 const source=await readFile(new URL('../src/components/mother/MotherNotifications.jsx',import.meta.url),'utf8')
 const {code}=await transformWithOxc(source,'MotherNotifications.jsx')
 for(const dictionary of [en,ar]) {
  const states=[],refs=[],effects=[];let cursor=0,refCursor=0,focused=0,navigation=''
  let records=[{id:'bookingSubmitted:test',type:'bookingSubmitted',childId:'adam',dateTime:'2026-11-01T10:00:00',createdAt:'2026-10-29T10:00:00Z',read:false}]
  const listeners=new Map()
  const bindings={_jsx:jsx.jsx,_jsxs:jsx.jsxs,useState:initial=>{const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return[states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value}]},useRef:()=>refs[refCursor++]??(refs[refCursor-1]={current:null}),useEffect:effect=>effects.push(effect),useLocation:()=>({pathname:'/mother',search:''}),useNavigate:()=>path=>{navigation=path},useLanguage:()=>({language:dictionary===ar?'ar':'en',t:key=>key.split('.').reduce((v,k)=>v[k],dictionary)}),getBookingMother:()=>({id:'demo-mother-sara'}),syncMotherNotifications:()=>records,markMotherNotificationsRead:(_mother,id)=>{records=records.map(item=>!id||item.id===id?{...item,read:true}:item);return records},motherNotificationEvents:{bookingSubmitted:{tab:'pending'}},window:{addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible',addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)},setInterval:()=>0,clearInterval(){}}
  const load=code.replace(/^import .*;?\r?\n/gm,'').replace(/export default /g,'')
  const Component=new Function(...Object.keys(bindings),load+'\nreturn MotherNotifications;')(...Object.values(bindings))
  const flatten=node=>!node||typeof node!=='object'?[]:[node,...(Array.isArray(node.props?.children)?node.props.children.flat(Infinity):[node.props?.children]).flatMap(flatten)]
  const render=()=>{cursor=0;refCursor=0;effects.length=0;return flatten(Component())}
  let tree=render();effects[0]();tree=render()
  const bell=()=>tree.find(node=>node.props?.className==='mother-notifications__bell')
  assert.ok(bell().props['aria-label'].includes('1')||bell().props['aria-label'].includes('١'))
  bell().props.onClick();tree=render();assert.equal(bell().props['aria-expanded'],true)
  const direction = dictionary === ar ? 'rtl' : 'ltr'
  const panel = tree.find(node => node.props?.role === 'dialog')
  assert.equal(panel.props.dir, direction)
  assert.equal(panel.props.lang, dictionary === ar ? 'ar' : 'en')
  const description = tree.find(node => node.props?.className === 'mother-notifications__description')
  assert.equal(description.props.dir, direction)
  const descriptionNodes = flatten(description)
  assert.ok(descriptionNodes.some(node => node.type === 'bdi' && node.props.dir === 'auto' && node.props.children === dictionary.mother.adam))
  assert.ok(descriptionNodes.some(node => node.type === 'bdi' && node.props.dir === direction && node.props.children === dictionary.mother.notifications.bookingSubmittedDescription))
  assert.ok(!description.props.children.includes(' ? '))
  const appointmentTime = tree.find(node => node.type === 'time' && node.props.dateTime === records[0].dateTime)
  assert.equal(appointmentTime.props.children.props.dir, direction)
  assert.ok(appointmentTime.props.children.props.children.includes(new Intl.NumberFormat(dictionary === ar ? 'ar-JO' : 'en-US', { useGrouping: false }).format(2026)))
  refs[0].current={contains:target=>target==='inside'};refs[1].current={focus:()=>focused++};refs[2].current={querySelector:()=>({focus(){}})}
  const cleanup=effects[1]();listeners.get('pointerdown')({target:'outside'});tree=render();assert.equal(bell().props['aria-expanded'],false);cleanup()
  bell().props.onClick();tree=render();tree[0].props.onKeyDown({key:'Escape'});tree=render();assert.equal(bell().props['aria-expanded'],false);assert.ok(focused)
  bell().props.onClick();tree=render();tree.find(node=>node.props?.className==='mother-notifications__mark').props.onClick();tree=render();assert.ok(records.every(item=>item.read));assert.equal(tree.find(node=>node.props?.className==='mother-notifications__mark').props.disabled,true)
  tree.find(node=>node.props?.className==='mother-notifications__item').props.onClick();assert.equal(navigation,'/mother/appointments?tab=pending');tree=render();assert.equal(bell().props['aria-expanded'],false)
  bell().props.onClick();tree=render();bell().props.onClick();tree=render();assert.equal(bell().props['aria-expanded'],false)
 }
})
