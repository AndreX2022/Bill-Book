(function(root){
'use strict';
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const roundQty=n=>Math.round((Number(n)+Number.EPSILON)*1000)/1000;
const date=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
function initial(){return {version:1,business:{name:'Suman Murmu',phone:'798006211',email:'',address:'',state:'West Bengal',gstin:'',upi:'798006211@sbi',prefix:'BILL',seq:1,qr:'',qrWidth:0,qrHeight:0,qrSizing:'auto',bankName:'',accountHolder:'',bankAccount:'',bankIfsc:'',bankBranch:'',supportEmail:''},customers:[],items:[],invoices:[]};}
function amount(v,label,min=0,max=1e9){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label} must be between ${min} and ${max}.`);return n;}
function totals(lines,inter,type){if(!lines.length)throw Error('Add at least one item.');let items=lines.map(l=>{
 if(!String(l.description||'').trim())throw Error('Enter an item description.');
 const quantity=roundQty(amount(l.quantity,'Quantity',0.001,1e6)),rate=amount(l.rate,'Rate'),discountPct=amount(l.discountPct,'Discount',0,100),gstRate=type==='BOS'?0:amount(l.gstRate,'GST',0,28);
 const taxableValue=round(quantity*rate*(1-discountPct/100));
 if(taxableValue>1e10)throw Error('Line amount is too large.');
 const cgst=inter?0:round(taxableValue*gstRate/200),sgst=cgst,igst=inter?round(taxableValue*gstRate/100):0;
 return {...l,id:id(),quantity,rate,discountPct,gstRate,taxableValue,cgst,sgst,igst,total:round(taxableValue+cgst+sgst+igst)};
 });let t={items};for(let k of ['taxableValue','cgst','sgst','igst'])t[k]=round(items.reduce((s,l)=>s+l[k],0));
 const pre=round(t.taxableValue+t.cgst+t.sgst+t.igst);t.grandTotal=Math.round(pre);t.roundOff=round(t.grandTotal-pre);amount(t.grandTotal,'Bill total');return t;
}
function create(db,input){if(!['BOS','GST'].includes(input.type))throw Error('Invalid document type.');const customer=db.customers.find(c=>c.id===input.customerId);if(!customer)throw Error('Choose a customer.');if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw Error('Choose a bill date.');if(input.dueDate&&input.dueDate<input.date)throw Error('Due date cannot precede the bill date.');
 if(input.type==='GST'&&!db.business.gstin.trim())throw Error('Add your business GSTIN in Settings before creating a GST invoice.');
 const inter=db.business.state.trim().toLowerCase()!==customer.state.trim().toLowerCase();let t=totals(input.lines,inter,input.type);
 const used=Object.create(null);for(let l of t.items)if(l.itemId)used[l.itemId]=roundQty((used[l.itemId]||0)+l.quantity);
 for(let [key,qty] of Object.entries(used)){let item=db.items.find(x=>x.id===key);if(!item)throw Error('A selected product no longer exists.');if(qty>item.stockQty)throw Error(`Insufficient stock for ${item.name}. Available: ${item.stockQty}.`);}
 const paid=round(amount(input.paid||0,'Payment',0,t.grandTotal));let number;
 do {number=`${db.business.prefix||'BILL'}-${String(db.business.seq++).padStart(4,'0')}`;}while(db.invoices.some(i=>i.number===number));
 const invoice={...t,id:id(),number,type:input.type,date:input.date,dueDate:input.dueDate||'',notes:input.notes||'',customer:{...customer},business:{...db.business},amountPaid:paid,cancelled:false,payments:paid?[{id:id(),amount:paid,date:date(),mode:input.mode||'Cash'}]:[]};
 for(let [key,qty] of Object.entries(used)){let item=db.items.find(x=>x.id===key);item.stockQty=roundQty(item.stockQty-qty);}
 db.invoices.unshift(invoice);return invoice;
}
function status(i){return i.cancelled?'CANCELLED':i.amountPaid>=i.grandTotal?'PAID':i.dueDate&&i.dueDate<date()?'OVERDUE':i.amountPaid>0?'PARTIALLY_PAID':'UNPAID';}
function payment(i,value,mode){if(i.cancelled)throw Error('Cancelled bills cannot receive payments.');let n=round(amount(value,'Payment',0.01,round(i.grandTotal-i.amountPaid)));if(n<=0)throw Error('Payment must be at least 0.01.');i.amountPaid=round(i.amountPaid+n);i.payments.push({id:id(),amount:n,date:date(),mode:mode||'Cash'});}
function cancel(db,i){if(i.cancelled)return;if(i.amountPaid>0)throw Error('Bills with payments cannot be cancelled.');i.cancelled=true;for(let l of i.items){let item=db.items.find(x=>x.id===l.itemId);if(item)item.stockQty=roundQty(item.stockQty+l.quantity);}}
function hasBankPayment(i){return !i.cancelled&&i.payments.some(p=>p.mode==='Bank transfer'&&Number(p.amount)>0);}
function invoiceBusiness(i){const b={...i.business};if(!hasBankPayment(i))for(const k of ['bankName','accountHolder','bankAccount','bankIfsc','bankBranch'])b[k]='';return b;}
function update(db,id,input){
 const old=db.invoices.find(i=>i.id===id);if(!old)throw Error('Bill not found.');if(old.cancelled)throw Error('Cancelled bills cannot be edited.');
 const next=JSON.parse(JSON.stringify(db));const target=next.invoices.find(i=>i.id===id);
 for(const l of target.items){const p=next.items.find(p=>p.id===l.itemId);if(p)p.stockQty=roundQty(p.stockQty+l.quantity);}
 next.business={...old.business,seq:db.business.seq};
 if(input.customerId===old.customer.id)next.customers=[{...old.customer},...next.customers.filter(c=>c.id!==old.customer.id)];
 const revised=create(next,{...input,paid:0});if(revised.grandTotal<old.amountPaid)throw Error('Bill total cannot be less than recorded payments.');
 Object.assign(revised,{id:old.id,number:old.number,business:{...old.business},payments:old.payments.map(p=>({...p})),amountPaid:old.amountPaid,updatedAt:new Date().toISOString()});
 db.items=next.items;db.invoices[db.invoices.findIndex(i=>i.id===id)]=revised;return revised;
}
function removeInvoice(db,id){const i=db.invoices.find(i=>i.id===id);if(!i)throw Error('Bill not found.');if(!i.cancelled)for(const l of i.items){const p=db.items.find(p=>p.id===l.itemId);if(p)p.stockQty=roundQty(p.stockQty+l.quantity);}db.invoices=db.invoices.filter(i=>i.id!==id);}
function billQrSize(i){const side=Math.max(108,144-Math.max(0,i.items.length-3)*3);return qrSize(i.business.qrWidth,i.business.qrHeight,side,side);}
function qrSize(width,height,maxWidth=180,maxHeight=180){
 width=amount(width,'QR width',1,20000);height=amount(height,'QR height',1,20000);
 const scale=Math.min(1,maxWidth/width,maxHeight/height);
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
function checkBank(b){
 for(let key of ['bankName','accountHolder','bankAccount','bankIfsc','bankBranch'])if(b[key]!==undefined&&(typeof b[key]!=='string'||b[key].length>150))throw Error('Invalid bank details.');
 if(b.bankAccount&&!/^\d{6,30}$/.test(b.bankAccount))throw Error('Account number must contain 6–30 digits.');
 if(b.bankIfsc&&!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(b.bankIfsc))throw Error('Enter a valid 11-character IFSC code.');
 if([b.bankName,b.accountHolder,b.bankAccount,b.bankIfsc].some(Boolean)&&![b.bankName,b.accountHolder,b.bankAccount,b.bankIfsc].every(x=>typeof x==='string'&&x.trim()))throw Error('Enter bank name, account holder, account number and IFSC, or leave all bank details blank.');
}
function checkSupport(b){if(b.supportEmail!==undefined&&(typeof b.supportEmail!=='string'||b.supportEmail.length>254||(b.supportEmail&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(b.supportEmail))))throw Error('Enter a valid support email address.');}
function migrate(data){validate(data);const defaults={bankName:'',accountHolder:'',bankAccount:'',bankIfsc:'',bankBranch:'',supportEmail:'',qrSizing:'auto'};data.business={...defaults,...data.business};for(let i of data.invoices)i.business={...defaults,...i.business};return data;}
function validate(data){if(!data||data.version!==1||!data.business||!Array.isArray(data.customers)||!Array.isArray(data.items)||!Array.isArray(data.invoices))throw Error('This is not a valid BillBook backup.');
 function checkQR(b){if(typeof b.name!=='string'||typeof b.state!=='string')throw Error('Invalid business snapshot.');if(b.qr){if(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.qr)||!Number.isInteger(b.qrWidth)||b.qrWidth<1||b.qrWidth>20000||!Number.isInteger(b.qrHeight)||b.qrHeight<1||b.qrHeight>20000)throw Error('Invalid QR image.');}}
 let b=data.business;checkQR(b);checkBank(b);checkSupport(b);if(typeof b.name!=='string'||typeof b.state!=='string'||!Number.isSafeInteger(b.seq)||b.seq<1||b.seq>1e9||typeof b.prefix!=='string'||typeof b.gstin!=='string')throw Error('Invalid business details.');
 if(b.qr&&!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.qr))throw Error('Invalid QR image.');
 for(let c of data.customers)if(typeof c.id!=='string'||typeof c.name!=='string'||typeof c.state!=='string')throw Error('Invalid customer.');
 for(let p of data.items){if(typeof p.id!=='string'||typeof p.name!=='string')throw Error('Invalid product.');amount(p.stockQty,'Stock');amount(p.salePrice,'Price');amount(p.gstRate,'GST',0,28);}
 for(let i of data.invoices){if(typeof i.id!=='string'||typeof i.number!=='string'||!Array.isArray(i.items)||!Array.isArray(i.payments)||!i.customer||!i.business||!['BOS','GST'].includes(i.type))throw Error('Invalid bill.');checkQR(i.business);checkBank(i.business);if(typeof i.customer.name!=='string'||typeof i.customer.state!=='string')throw Error('Invalid customer snapshot.');amount(i.grandTotal,'Total');amount(i.amountPaid,'Paid',0,i.grandTotal);for(let l of i.items){if(typeof l.description!=='string')throw Error('Invalid bill item.');for(let k of ['quantity','rate','gstRate','total'])amount(l[k],k);}}
 for(let list of [data.customers,data.items,data.invoices]){for(let x of list)if(!/^[A-Za-z0-9_-]+$/.test(x.id))throw Error('Invalid record ID.');}for(let list of [data.customers,data.items,data.invoices])if(new Set(list.map(x=>x.id)).size!==list.length)throw Error('Duplicate record IDs.');return data;
}
const api={update,removeInvoice,hasBankPayment,invoiceBusiness,billQrSize,round,roundQty,date,id,initial,amount,totals,create,status,payment,cancel,validate,qrSize,checkBank,checkSupport,migrate};root.BillCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
