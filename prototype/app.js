const DB="beautyHubDB", VER=1;
let db, state={user:null,view:"dashboard",products:[],sales:[],cart:[],settings:{name:"Beauty Hub Salon",currency:"KSh",footer:"Thank you for choosing Beauty Hub Salon."}};

function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{const d=r.result;["products","sales","settings"].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:"id"})})};r.onsuccess=()=>{db=r.result;res(db)};r.onerror=()=>rej(r.error)})}
function tx(store,mode="readonly"){return db.transaction(store,mode).objectStore(store)}
function getAll(store){return new Promise((res,rej)=>{const r=tx(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(store,v){return new Promise((res,rej)=>{const r=tx(store,"readwrite").put(v);r.onsuccess=()=>res(v);r.onerror=()=>rej(r.error)})}
function del(store,id){return new Promise((res,rej)=>{const r=tx(store,"readwrite").delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
const id=()=>crypto.randomUUID();
const money=n=>`${state.settings.currency} ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function now(){return new Date().toISOString()}
function toast(msg){const e=document.createElement("div");e.textContent=msg;e.style.cssText="position:fixed;right:18px;bottom:18px;background:#261d24;color:white;padding:12px 16px;border-radius:12px;z-index:99;box-shadow:0 10px 30px #0003";document.body.appendChild(e);setTimeout(()=>e.remove(),2300)}
async function load(){state.products=await getAll("products");state.sales=await getAll("sales");const s=await getAll("settings");if(s[0])state.settings=s[0];}
function todaySales(){const d=new Date();return state.sales.filter(x=>new Date(x.created_at).toDateString()===d.toDateString())}
function totals(sales){return sales.reduce((a,s)=>({revenue:a.revenue+s.total,cost:a.cost+s.cost,profit:a.profit+s.profit}),{revenue:0,cost:0,profit:0})}

async function init(){
 await openDB(); await load();
 if(localStorage.getItem("bh_manager")) state.user=JSON.parse(localStorage.getItem("bh_manager"));
 if(!state.user) return renderLogin();
 render();
 if("serviceWorker"in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
 window.addEventListener("online",()=>render());
 window.addEventListener("offline",()=>render());
}
function renderLogin(){
 document.getElementById("app").innerHTML=`<main class="login"><section class="login-card">
 <div class="logo"><div class="logo-mark">BH</div><span>Beauty Hub Salon</span></div>
 <h1>Manager access</h1><p class="muted">Private business workspace. Your operational data stays on this device.</p>
 <form id="loginForm"><div class="field"><label>Manager name</label><input id="mgrName" value="Manager" required></div>
 <div class="field"><label>PIN</label><input id="pin" type="password" inputmode="numeric" minlength="4" placeholder="4+ digits" required></div>
 <button class="btn btn-primary full">Enter manager workspace</button></form>
 <p class="muted" style="font-size:12px;margin-top:18px">First use creates the manager profile locally.</p>
 </section></main>`;
 document.getElementById("loginForm").onsubmit=e=>{e.preventDefault();const pin=document.getElementById("pin").value;if(pin.length<4)return toast("PIN must be at least 4 digits");state.user={name:document.getElementById("mgrName").value.trim()||"Manager",pin};localStorage.setItem("bh_manager",JSON.stringify(state.user));render()};
}
function render(){
 const online=navigator.onLine;
 const nav=[["dashboard","Dashboard"],["inventory","Inventory"],["sale","New Sale"],["sales","Sales"],["reports","Reports"],["settings","Settings"]];
 document.getElementById("app").innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><div class="logo-mark" style="width:36px;height:36px;border-radius:11px">BH</div><strong>Beauty Hub Salon</strong></div><div class="status"><span class="dot ${online?"online":""}"></span>${online?"Online":"Offline"} <button class="btn btn-ghost" id="logout">Lock</button></div></header>
 <div class="layout"><nav class="nav">${nav.map(([k,v])=>`<button class="${state.view===k?"active":""}" data-view="${k}">${v}</button>`).join("")}</nav><main class="main" id="main"></main></div></div>`;
 document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{state.view=b.dataset.view;state.cart=[];render()});
 document.getElementById("logout").onclick=()=>{state.user=null;renderLogin()};
 renderView();
}
function renderView(){const m=document.getElementById("main");({dashboard:dashboard,inventory:inventory,newsale:sale,sale:sale,sales:sales,reports:reports,settings:settings}[state.view]||dashboard)(m)}
function dashboard(m){
 const t=totals(todaySales()), stockValue=state.products.reduce((a,p)=>a+p.quantity*p.buying_price,0),low=state.products.filter(p=>p.quantity<=p.low).length;
 m.innerHTML=`<div class="page-title"><div><h1>Good business, ${esc(state.user.name)}</h1><div class="muted">Today's business at a glance</div></div><button class="btn btn-primary" onclick="state.view='sale';render()">+ New sale</button></div>
 <div class="cards"><div class="card"><div class="muted">Today's sales</div><div class="metric">${money(t.revenue)}</div></div><div class="card"><div class="muted">Today's profit</div><div class="metric good">${money(t.profit)}</div></div><div class="card"><div class="muted">Stock value</div><div class="metric">${money(stockValue)}</div></div><div class="card"><div class="muted">Low-stock items</div><div class="metric ${low?"bad":""}">${low}</div></div></div>
 <div class="grid2"><section class="card"><h3>Recent sales</h3>${state.sales.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,7).map(s=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span>${esc(s.items.map(i=>i.name).join(", "))}</span><strong>${money(s.total)}</strong></div>`).join("")||`<div class="empty">No sales yet.</div>`}</section>
 <section class="card"><h3>Stock watch</h3>${state.products.slice().sort((a,b)=>a.quantity-b.quantity).slice(0,7).map(p=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span>${esc(p.name)}</span><strong class="${p.quantity<=p.low?"low":""}">${p.quantity}</strong></div>`).join("")||`<div class="empty">No inventory yet.</div>`}</section></div>`;
}
function inventory(m){
 let list=state.products;
 m.innerHTML=`<div class="page-title"><div><h1>Inventory</h1><div class="muted">${list.length} items</div></div><button class="btn btn-primary" id="add">+ Add stock</button></div>
 <div class="toolbar"><input id="search" placeholder="Search products"><select id="cat"><option value="">All categories</option>${[...new Set(list.map(x=>x.category))].map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
 <section class="card table-wrap"><table class="table"><thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Buying</th><th>Selling</th><th>Profit/unit</th><th></th></tr></thead><tbody id="invRows"></tbody></table></section>`;
 const draw=()=>{const q=document.getElementById("search").value.toLowerCase(),c=document.getElementById("cat").value;document.getElementById("invRows").innerHTML=list.filter(p=>(!q||p.name.toLowerCase().includes(q))&&(!c||p.category===c)).map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td><span class="badge">${esc(p.category)}</span></td><td class="${p.quantity<=p.low?"low":""}">${p.quantity}</td><td>${money(p.buying_price)}</td><td>${money(p.selling_price)}</td><td class="${p.selling_price-p.buying_price<0?"low":""}">${money(p.selling_price-p.buying_price)}</td><td><button class="btn btn-secondary" onclick="editProduct('${p.id}')">Edit</button> <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">Delete</button></td></tr>`).join("")||`<tr><td colspan="7" class="empty">No matching stock.</td></tr>`};draw();document.getElementById("search").oninput=draw;document.getElementById("cat").onchange=draw;document.getElementById("add").onclick=()=>productModal();
}
async function productModal(existing){
 const p=existing||{name:"",category:"Cosmetics",quantity:0,buying_price:0,selling_price:0,low:5,service:false};
 const cats=["Cosmetics","Hair Products","Braids & Extensions","Skincare","Accessories","Plaiting Service","Nails","Other Services"];
 const modal=document.createElement("div");modal.className="modal";modal.innerHTML=`<div class="modal-box"><div class="modal-head"><h2>${existing?"Edit stock":"Add stock"}</h2><button class="btn btn-ghost" id="x">×</button></div>
 <form id="pf"><div class="form-grid"><div class="field wide"><label>Product / service name</label><input id="pn" value="${esc(p.name)}" required></div>
 <div class="field"><label>Category</label><select id="pc">${cats.map(c=>`<option ${c===p.category?"selected":""}>${c}</option>`).join("")}</select></div>
 <div class="field"><label>Quantity available</label><input id="pq" type="number" min="0" step="1" value="${p.quantity}" required></div>
 <div class="field"><label>Buying price</label><input id="pb" type="number" min="0" step="0.01" value="${p.buying_price}" required></div>
 <div class="field"><label>Selling price</label><input id="ps" type="number" min="0" step="0.01" value="${p.selling_price}" required></div>
 <div class="field"><label>Low-stock threshold</label><input id="pl" type="number" min="0" step="1" value="${p.low??5}" required></div></div>
 <button class="btn btn-primary full">${existing?"Save changes":"Add to inventory"}</button></form></div>`;
 document.body.appendChild(modal);modal.querySelector("#x").onclick=()=>modal.remove();modal.querySelector("#pf").onsubmit=async e=>{e.preventDefault();const v={...p,id:p.id||id(),name:document.getElementById("pn").value.trim(),category:document.getElementById("pc").value,quantity:+document.getElementById("pq").value,buying_price:+document.getElementById("pb").value,selling_price:+document.getElementById("ps").value,low:+document.getElementById("pl").value,updated_at:now()};await put("products",v);modal.remove();await load();render();toast(existing?"Stock updated":"Stock added")};
}
window.editProduct=async id=>{const p=state.products.find(x=>x.id===id);if(p)productModal(p)};
window.deleteProduct=async id=>{if(!confirm("Delete this inventory item? Completed sales will remain in history."))return;await del("products",id);await load();render();toast("Inventory item deleted")};

function sale(m){
 let available=state.products.filter(p=>p.quantity>0);
 const total=state.cart.reduce((a,i)=>a+i.qty*i.price,0),cost=state.cart.reduce((a,i)=>a+i.qty*i.cost,0),profit=total-cost;
 m.innerHTML=`<div class="page-title"><div><h1>New Sale</h1><div class="muted">Select stock and complete the transaction</div></div></div>
 <div class="grid2"><section class="card"><div class="toolbar"><input id="sq" placeholder="Search stock"><select id="si"><option value="">Choose an item…</option>${available.map(p=>`<option value="${p.id}">${esc(p.name)} — ${p.quantity} available</option>`).join("")}</select><button class="btn btn-secondary" id="addcart">Add</button></div><div id="available"></div></section>
 <section class="card"><h3>Cart</h3><div>${state.cart.map(i=>`<div class="cart-row"><div><strong>${esc(i.name)}</strong><div class="muted">${money(i.price)} each</div></div><input type="number" min="1" max="${i.available}" value="${i.qty}" data-qty="${i.id}"><strong>${money(i.qty*i.price)}</strong><button class="btn btn-danger" data-remove="${i.id}">×</button></div>`).join("")||`<div class="empty">Cart is empty.</div>`}</div>
 <div class="summary"><div><span>Subtotal</span><strong>${money(total)}</strong></div><div><span>Cost</span><strong>${money(cost)}</strong></div><div><span>Profit / loss</span><strong class="${profit<0?"low":""}">${money(profit)}</strong></div>
 <div class="field"><label>Payment method</label><select id="pay"><option>Cash</option><option>Mobile Money</option><option>Card</option></select></div><div class="field"><label>Amount paid</label><input id="paid" type="number" min="${total}" step="0.01" value="${total}"></div>
 <div><span>Change</span><strong>${money(Math.max(0,(+document.getElementById?.("paid")?.value||total)-total))}</strong></div><button class="btn btn-primary full" id="complete" ${!state.cart.length?"disabled":""}>Complete sale & print receipt</button></div></section></div>`;
 document.getElementById("addcart").onclick=()=>{const idv=document.getElementById("si").value,p=state.products.find(x=>x.id===idv);if(!p)return;const old=state.cart.find(x=>x.id===p.id);if(old){if(old.qty>=p.quantity)return toast("Not enough stock");old.qty++}else state.cart.push({id:p.id,name:p.name,qty:1,price:p.selling_price,cost:p.buying_price,available:p.quantity});renderView()};
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{state.cart=state.cart.filter(x=>x.id!==b.dataset.remove);renderView()});
 document.querySelectorAll("[data-qty]").forEach(inp=>inp.onchange=()=>{const i=state.cart.find(x=>x.id===inp.dataset.qty);const n=Math.floor(+inp.value);if(!i)return;i.qty=Math.max(1,Math.min(i.available,n||1));renderView()});
 document.getElementById("complete").onclick=completeSale;
}
async function completeSale(){
 if(!state.cart.length)return;const total=state.cart.reduce((a,i)=>a+i.qty*i.price,0),cost=state.cart.reduce((a,i)=>a+i.qty*i.cost,0),paid=+document.getElementById("paid").value;
 if(paid<total)return toast("Amount paid is less than total");
 for(const i of state.cart){const p=state.products.find(x=>x.id===i.id);if(!p||p.quantity<i.qty)return toast(`Not enough stock: ${i.name}`)}
 for(const i of state.cart){const p=state.products.find(x=>x.id===i.id);p.quantity-=i.qty;p.updated_at=now();await put("products",p)}
 const s={id:id(),created_at:now(),items:state.cart.map(i=>({name:i.name,qty:i.qty,price:i.price,cost:i.cost})),total,cost,profit:total-cost,paid,payment:document.getElementById("pay").value,change:paid-total,manager:state.user.name};
 await put("sales",s);await load();state.cart=[];printReceipt(s);render();
}
function printReceipt(s){
 const w=window.open("","_blank","width=520,height=700");if(!w)return toast("Allow pop-ups to print receipt");
 w.document.write(`<html><head><title>Receipt ${s.id.slice(0,8)}</title><style>body{font-family:Arial;padding:24px;max-width:480px;margin:auto}h2{text-align:center}.c{text-align:center;color:#666}table{width:100%;border-collapse:collapse;margin:20px 0}td{padding:7px 0;border-bottom:1px dashed #ccc}.r{text-align:right}.total{font-size:20px;font-weight:bold}</style></head><body><h2>${esc(state.settings.name)}</h2><div class="c">Receipt #${s.id.slice(0,8).toUpperCase()}<br>${new Date(s.created_at).toLocaleString()}</div><p>Manager: ${esc(s.manager)}</p><table>${s.items.map(i=>`<tr><td>${esc(i.name)} × ${i.qty}</td><td class="r">${money(i.qty*i.price)}</td></tr>`).join("")}</table><div class="r total">Total: ${money(s.total)}</div><p>Payment: ${esc(s.payment)}<br>Paid: ${money(s.paid)}<br>Change: ${money(s.change)}</p><p class="c">${esc(state.settings.footer)}</p><script>window.onload=()=>window.print()</script></body></html>`);w.document.close();
}
function sales(m){
 const list=state.sales.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)),t=totals(list);
 m.innerHTML=`<div class="page-title"><div><h1>Sales history</h1><div class="muted">${list.length} completed transactions · ${money(t.revenue)} revenue</div></div></div><section class="card table-wrap"><table class="table"><thead><tr><th>Date</th><th>Receipt</th><th>Items</th><th>Payment</th><th>Total</th><th>Profit</th><th></th></tr></thead><tbody>${list.map(s=>`<tr><td>${new Date(s.created_at).toLocaleString()}</td><td>#${s.id.slice(0,8).toUpperCase()}</td><td>${esc(s.items.map(i=>`${i.name} ×${i.qty}`).join(", "))}</td><td>${esc(s.payment)}</td><td>${money(s.total)}</td><td class="${s.profit<0?"low":""}">${money(s.profit)}</td><td><button class="btn btn-secondary" onclick='reprint(${JSON.stringify(s)})'>Print</button></td></tr>`).join("")||`<tr><td colspan="7" class="empty">No sales recorded.</td></tr>`}</tbody></table></section>`;
}
window.reprint=printReceipt;
function reports(m){
 const t=totals(state.sales),today=totals(todaySales()),month=totals(state.sales.filter(s=>{const d=new Date(s.created_at),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}));
 m.innerHTML=`<div class="page-title"><div><h1>Reports</h1><div class="muted">Automatic business performance</div></div></div><div class="report-grid"><div class="card"><div class="muted">Today revenue</div><div class="metric">${money(today.revenue)}</div></div><div class="card"><div class="muted">Today profit</div><div class="metric good">${money(today.profit)}</div></div><div class="card"><div class="muted">Today cost</div><div class="metric">${money(today.cost)}</div></div><div class="card"><div class="muted">This month revenue</div><div class="metric">${money(month.revenue)}</div></div><div class="card"><div class="muted">This month profit</div><div class="metric good">${money(month.profit)}</div></div><div class="card"><div class="muted">All-time revenue</div><div class="metric">${money(t.revenue)}</div></div></div>
 <section class="card" style="margin-top:16px"><h3>Profit logic</h3><p class="muted">For stocked products, profit = selling price − buying price. A negative result is shown as a loss. Services can be entered as stock items with a buying cost of zero or a configured cost.</p></section>`;
}
function settings(m){
 m.innerHTML=`<div class="page-title"><div><h1>Settings</h1><div class="muted">Manager workspace and receipt settings</div></div></div><section class="card"><form id="sf" style="max-width:620px"><div class="field"><label>Salon name</label><input id="sn" value="${esc(state.settings.name)}"></div><div class="field"><label>Currency</label><input id="cur" value="${esc(state.settings.currency)}"></div><div class="field"><label>Receipt footer</label><input id="foot" value="${esc(state.settings.footer)}"></div><button class="btn btn-primary">Save settings</button></form></section><section class="card" style="margin-top:16px"><h3>Data</h3><p class="muted">Your inventory and sales are stored locally in IndexedDB on this device. Export a backup before changing devices.</p><button class="btn btn-secondary" id="export">Export backup</button> <button class="btn btn-danger" id="wipe">Clear all business data</button></section>`;
 document.getElementById("sf").onsubmit=async e=>{e.preventDefault();state.settings={id:"settings",name:document.getElementById("sn").value.trim()||"Beauty Hub Salon",currency:document.getElementById("cur").value.trim()||"KSh",footer:document.getElementById("foot").value.trim()};await put("settings",state.settings);toast("Settings saved");render()};
 document.getElementById("export").onclick=()=>{const data={products:state.products,sales:state.sales,settings:state.settings,exported_at:now()};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=`beauty-hub-backup-${new Date().toISOString().slice(0,10)}.json`;a.click()};
 document.getElementById("wipe").onclick=async()=>{if(!confirm("This permanently clears inventory and sales from this device. Continue?"))return;for(const p of state.products)await del("products",p.id);for(const s of state.sales)await del("sales",s.id);await load();render();toast("Business data cleared")};
}
init();