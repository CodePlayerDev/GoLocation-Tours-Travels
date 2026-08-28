const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDir, {recursive:true});
const db = new Database(path.join(dataDir, "golocation.db"));
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const adminSessions = new Set();
const uploadsDir = path.join(dataDir, "uploads");
fs.mkdirSync(uploadsDir, {recursive:true});
const upload = multer({
  dest: uploadsDir,
  limits: {fileSize: 5 * 1024 * 1024},
  fileFilter: (req, file, callback) => callback(null, ["image/jpeg","image/png","image/webp"].includes(file.mimetype))
});
const excelUpload = multer({memoryStorage:true, limits:{files:20, fileSize:10 * 1024 * 1024}});
const columnValue = (row, names) => {
  const key = Object.keys(row).find(item => names.includes(item.toLowerCase().replace(/[^a-z]/g, "")));
  return key ? String(row[key] || "").trim() : "";
};

db.exec(`
CREATE TABLE IF NOT EXISTS hotels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT,
  price INTEGER NOT NULL,
  rating REAL DEFAULT 0,
  amenities TEXT,
  category TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_code TEXT UNIQUE NOT NULL,
  hotel_id INTEGER,
  hotel_name TEXT NOT NULL,
  hotel_city TEXT,
  room_id INTEGER,
  room_name TEXT,
  occupancy INTEGER DEFAULT 2,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  guests TEXT,
  amount INTEGER DEFAULT 0,
  hotel_cost INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS room_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  max_guests INTEGER DEFAULT 2,
  inventory INTEGER DEFAULT 1,
  amenities TEXT,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(hotel_id) REFERENCES hotels(id)
);
CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
try { db.exec("ALTER TABLE bookings ADD COLUMN room_id INTEGER"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE bookings ADD COLUMN room_name TEXT"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE bookings ADD COLUMN occupancy INTEGER DEFAULT 2"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE bookings ADD COLUMN hotel_city TEXT"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE hotels ADD COLUMN image TEXT DEFAULT ''"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE hotels ADD COLUMN category TEXT DEFAULT ''"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE hotels ADD COLUMN phone TEXT DEFAULT ''"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE hotels ADD COLUMN website TEXT DEFAULT ''"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE room_categories ADD COLUMN single_price INTEGER DEFAULT 0"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE room_categories ADD COLUMN double_price INTEGER DEFAULT 0"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }
try { db.exec("ALTER TABLE room_categories ADD COLUMN triple_price INTEGER DEFAULT 0"); } catch (error) { if (!error.message.includes("duplicate column name")) throw error; }

const defaultSettings = {
  site_name: "GoLocation Tours & Travels", phone: "+91 74405 80498", email: "info@golocation.in",
  address: "Bhopal, Madhya Pradesh, India", hero_title: "Find Your Perfect Stay Across India",
  hero_copy: "Comfortable hotels, amazing destinations and unforgettable experiences — all in one place."
};
  const indianCities = ["Agra","Ahmedabad","Amritsar","Aurangabad","Balaghat","Bengaluru","Bhopal","Bhubaneswar","Chandigarh","Chennai","Coimbatore","Dehradun","Delhi","Dharamshala","Gandhinagar","Goa","Gurugram","Guwahati","Gwalior","Haridwar","Hyderabad","Indore","Jabalpur","Jaipur","Jaisalmer","Jodhpur","Katni","Khandwa","Khargone","Kochi","Kolkata","Kota","Lucknow","Ludhiana","Mandsaur","Manali","Mangaluru","Meerut","Morena","Mumbai","Munnar","Mysuru","Nagpur","Nashik","Neemuch","Noida","Ooty","Patna","Pondicherry","Prayagraj","Pune","Raisen","Ratlam","Rewa","Rishikesh","Ranchi","Satna","Sehore","Shahdol","Shimla","Shivpuri","Siliguri","Singrauli","Srinagar","Sagar","Surat","Thane","Thiruvananthapuram","Udaipur","Ujjain","Vadodara","Varanasi","Vidisha","Vijayawada","Visakhapatnam","Wayanad"];
const settingInsert = db.prepare("INSERT OR IGNORE INTO site_settings(key,value) VALUES(?,?)");
Object.entries(defaultSettings).forEach(([key,value]) => settingInsert.run(key,value));

const count = db.prepare("SELECT COUNT(*) AS c FROM hotels").get().c;
if (!count) {
  const insert = db.prepare("INSERT INTO hotels(name,city,area,price,rating,amenities) VALUES(?,?,?,?,?,?)");
  [
    ["Taj Holiday Village Resort","Goa","Calangute Beach",5499,4.7,"WiFi • Pool • Restaurant • AC"],
    ["The Himalayan Heights","Manali","Near Mall Road",4199,4.5,"WiFi • Parking • Restaurant • Bonfire"],
    ["Hotel Royal Heritage","Jaipur","City Palace Road",3799,4.6,"WiFi • Pool • Restaurant • AC"],
    ["Kerala Green Palace","Kerala","Alleppey • Backwaters",3499,4.4,"WiFi • AC • Restaurant • Spa"],
    ["Lake View Hotel","Udaipur","Lake Pichola",6499,4.8,"WiFi • Pool • Restaurant • AC"],
    ["Snow Valley Retreat","Shimla","Mall Road",3299,4.5,"WiFi • Parking • Restaurant • Heater"]
  ].forEach(h => insert.run(...h));
}

const hotelsWithoutRooms = db.prepare(`
  SELECT h.id, h.name, h.price
  FROM hotels h
  WHERE NOT EXISTS (SELECT 1 FROM room_categories r WHERE r.hotel_id = h.id)
`).all();
const defaultRoom = db.prepare(`
  INSERT INTO room_categories(hotel_id,name,description,price,max_guests,inventory,amenities)
  VALUES(?,?,?,?,?,?,?)
`);
const addDefaultRooms = db.transaction(() => hotelsWithoutRooms.forEach(hotel => {
  defaultRoom.run(
    hotel.id,
    "Deluxe Room",
    "Comfortable deluxe room with essential amenities for a pleasant stay.",
    2500,
    2,
    5,
    "WiFi • AC • TV • Attached bathroom"
  );
}));
addDefaultRooms();
db.prepare("UPDATE room_categories SET price=2500,single_price=2100,double_price=2500,triple_price=3500 WHERE lower(name)='deluxe room'").run();

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use("/uploads", express.static(uploadsDir));

function requireAdmin(req, res, next) {
  const token = req.get("Authorization")?.replace("Bearer ", "");
  if (!token || !adminSessions.has(token)) return res.status(401).json({error:"Admin login required."});
  next();
}

app.post("/api/admin/login", (req,res) => {
  const {username, password} = req.body;
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({error:"Invalid username or password."});
  }
  const token = crypto.randomBytes(24).toString("hex");
  adminSessions.add(token);
  res.json({token, username: ADMIN_USERNAME});
});

app.post("/api/admin/logout", requireAdmin, (req,res) => {
  const token = req.get("Authorization")?.replace("Bearer ", "");
  adminSessions.delete(token);
  res.json({ok:true});
});

app.get("/api/hotels", async (req,res) => {
  const q = (req.query.q || "").trim();
  let rows = q
    ? db.prepare("SELECT * FROM hotels WHERE active=1 AND LOWER(city)=LOWER(?) ORDER BY rating DESC").all(q)
    : db.prepare("SELECT * FROM hotels WHERE active=1 ORDER BY rating DESC").all();
  rows = rows.map(hotel => ({...hotel, source:"local", rooms: db.prepare("SELECT * FROM room_categories WHERE hotel_id=? AND active=1").all(hotel.id)}));
  if (q && GOOGLE_PLACES_API_KEY) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method:"POST", headers:{"Content-Type":"application/json","X-Goog-Api-Key":GOOGLE_PLACES_API_KEY,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.rating,places.userRatingCount,places.photos"},
        body:JSON.stringify({textQuery:`hotels in ${q}`, includedType:"lodging", languageCode:"en", maxResultCount:20})
      });
      if (response.ok) {
        const places = (await response.json()).places || [];
        const localNames = new Set(rows.map(hotel => hotel.name.toLowerCase()));
        const mapped = places.filter(place => place.displayName?.text && !localNames.has(place.displayName.text.toLowerCase())).map(place => ({
          id:`google-${place.id}`, name:place.displayName.text, city:q, area:place.formattedAddress || "", price:0, rating:place.rating || 0, amenities:"Google Maps listing", image:"", source:"google", mapsUrl:place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName.text+" "+(place.formattedAddress||q))}`, rooms:[]
        }));
        rows = rows.concat(mapped);
      }
    } catch (error) { console.error("Google Places search failed:", error.message); }
  }
  res.json(rows);
});

app.get("/api/hotels/:id", (req,res) => {
  const hotel = db.prepare("SELECT * FROM hotels WHERE id=? AND active=1").get(req.params.id);
  if (!hotel) return res.status(404).json({error:"Hotel not found."});
  hotel.rooms = db.prepare("SELECT * FROM room_categories WHERE hotel_id=? AND active=1 ORDER BY price").all(hotel.id);
  res.json(hotel);
});

app.get("/api/featured-hotels", (req,res) => {
  const featuredCities = ["Bhopal","Indore","Jabalpur","Gwalior","Ujjain","Sagar"];
  const hotels = featuredCities.map(city => db.prepare("SELECT * FROM hotels WHERE active=1 AND city=? ORDER BY rating DESC, id DESC LIMIT 1").get(city)).filter(Boolean);
  res.json(hotels.map(hotel => ({...hotel, rooms: db.prepare("SELECT * FROM room_categories WHERE hotel_id=? AND active=1").all(hotel.id)})));
});

app.get("/api/settings", (req,res) => res.json(Object.fromEntries(db.prepare("SELECT key,value FROM site_settings").all().map(item => [item.key,item.value]))));
app.get("/api/cities", (req,res) => {
  const storedCities = db.prepare("SELECT DISTINCT city FROM hotels WHERE active=1").all().map(item => item.city);
  res.json([...new Set([...indianCities, ...storedCities])].sort((a,b) => a.localeCompare(b)));
});

app.post("/api/bookings", (req,res) => {
  const {hotelId,hotelName,roomId=null,roomName="",occupancy=2,customerName,phone,email,checkin,checkout,guests,amount,hotelCost=0} = req.body;
  if (!hotelName || !customerName || !phone || !checkin || !checkout) {
    return res.status(400).json({error:"Required booking fields are missing."});
  }
  if (new Date(checkout) <= new Date(checkin)) {
    return res.status(400).json({error:"Check-out must be after check-in."});
  }
  const selectedHotel = hotelId ? db.prepare("SELECT city FROM hotels WHERE id=?").get(hotelId) : null;
  const selectedRoom = roomId ? db.prepare("SELECT * FROM room_categories WHERE id=? AND hotel_id=? AND active=1").get(roomId, hotelId) : null;
  if (roomId && !selectedRoom) return res.status(400).json({error:"Selected room is not available."});
  const safeOccupancy = Number(occupancy);
  if (!Number.isInteger(safeOccupancy) || safeOccupancy < 1 || safeOccupancy > 3) return res.status(400).json({error:"Choose a valid occupancy."});
  const tariff = selectedRoom ? (safeOccupancy === 1 ? selectedRoom.single_price : safeOccupancy === 2 ? selectedRoom.double_price : selectedRoom.triple_price) : Number(amount || 0);
  const nights = Math.ceil((new Date(checkout) - new Date(checkin)) / 86400000);
  const verifiedAmount = tariff * nights;
  const code = "GL-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const result = db.prepare(`
    INSERT INTO bookings(booking_code,hotel_id,hotel_name,hotel_city,room_id,room_name,occupancy,customer_name,phone,email,checkin,checkout,guests,amount,hotel_cost)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(code,hotelId||null,hotelName,selectedHotel?.city || "",roomId||null,roomName,safeOccupancy,customerName,phone,email||"",checkin,checkout,guests||`${safeOccupancy} Guest(s), 1 Room`,verifiedAmount,selectedRoom ? verifiedAmount : hotelCost);
  res.status(201).json({id:result.lastInsertRowid, bookingCode:code, status:"pending", paymentStatus:"unpaid"});
});

app.get("/api/bookings", requireAdmin, (req,res) => {
  const rows = db.prepare("SELECT b.*, COALESCE(b.hotel_city, h.city, '') AS hotel_city FROM bookings b LEFT JOIN hotels h ON h.id=b.hotel_id ORDER BY b.id DESC").all();
  res.json(rows);
});

app.patch("/api/bookings/:id", requireAdmin, (req,res) => {
  const updates = [];
  if (req.body.status) updates.push(["status", req.body.status]);
  if (req.body.payment_status) updates.push(["payment_status", req.body.payment_status]);
  if (!updates.length || updates.some(([,value]) => !["pending","confirmed","cancelled","paid","unpaid","refunded"].includes(value))) {
    return res.status(400).json({error:"Invalid booking update."});
  }
  const statement = db.prepare(`UPDATE bookings SET ${updates.map(([key]) => `${key}=?`).join(", ")} WHERE id=?`);
  statement.run(...updates.map(([,value]) => value), req.params.id);
  res.json({ok:true});
});

app.get("/api/admin/hotels", requireAdmin, (req,res) => {
  res.json(db.prepare("SELECT * FROM hotels ORDER BY active DESC, name").all().map(hotel => ({...hotel, rooms: db.prepare("SELECT * FROM room_categories WHERE hotel_id=? ORDER BY active DESC,name").all(hotel.id)})));
});

app.post("/api/admin/import-google", requireAdmin, async (req,res) => {
  const city = (req.body.city || "").trim();
  if (!city) return res.status(400).json({error:"Enter a city to import."});
  if (!GOOGLE_PLACES_API_KEY) return res.status(503).json({error:"Set GOOGLE_PLACES_API_KEY before importing Google hotels."});
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method:"POST", headers:{"Content-Type":"application/json","X-Goog-Api-Key":GOOGLE_PLACES_API_KEY,"X-Goog-FieldMask":"places.displayName,places.formattedAddress,places.rating"},
      body:JSON.stringify({textQuery:`hotels in ${city}`, includedType:"lodging", languageCode:"en", maxResultCount:20})
    });
    if (!response.ok) return res.status(502).json({error:"Google Places could not complete this search."});
    const places = (await response.json()).places || [];
    const insert = db.prepare("INSERT INTO hotels(name,city,area,price,rating,amenities,image) VALUES(?,?,?,?,?,?,?)");
    const imported = db.transaction(items => items.reduce((total, place) => {
      const name = place.displayName?.text;
      if (!name || db.prepare("SELECT id FROM hotels WHERE lower(name)=lower(?) AND lower(city)=lower(?)").get(name,city)) return total;
      insert.run(name,city,place.formattedAddress || "",0,place.rating || 0,"Imported from Google Places","");
      return total + 1;
    },0))(places);
    res.json({imported, found:places.length});
  } catch (error) { res.status(502).json({error:"Google Places request failed."}); }
});

app.post("/api/admin/import-excel", requireAdmin, excelUpload.array("files", 20), (req,res) => {
  if (!req.files?.length) return res.status(400).json({error:"Choose one or more Excel files."});
  const XLSX = require("xlsx");
  const insert = db.prepare("INSERT INTO hotels(name,city,area,price,rating,amenities,category,phone,website,image,active) VALUES(?,?,?,?,?,?,?,?,?,?,1)");
  let imported = 0, skipped = 0, rowsRead = 0;
  const importRows = db.transaction(() => req.files.forEach(file => {
    const workbook = XLSX.read(file.buffer, {type:"buffer"});
    workbook.SheetNames.forEach(sheetName => XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {defval:""}).forEach(row => {
      const name = columnValue(row,["hotelname","name","hotel"]);
      if (!name || /^s\.no|^hotelname$/i.test(name)) return;
      rowsRead++;
      const city = columnValue(row,["city","destination"]) || file.originalname.replace(/[_-]?\d+.*|\.xlsx$/gi, "").replace(/hotels?(directory|details|list|data)?/gi, "").trim();
      const category = columnValue(row,["category","type","hotelcategory"]);
      const phone = columnValue(row,["contactnumber","phone","contact","mobilenumber"]);
      const area = columnValue(row,["address","area","location"]);
      const website = columnValue(row,["websitebookinglink","website","bookinglink"]);
      if (!city || db.prepare("SELECT id FROM hotels WHERE lower(name)=lower(?) AND lower(city)=lower(?)").get(name,city)) { skipped++; return; }
      insert.run(name,city,area,0,0,category,category,phone,website,""); imported++;
    }));
  }));
  try { importRows(); res.json({imported,skipped,rowsRead}); } catch (error) { res.status(400).json({error:"Could not read one of the Excel files. Use .xlsx files with a header row."}); }
});

app.post("/api/hotels", requireAdmin, upload.single("image"), (req,res) => {
  const {name, city, area, price, rating=0, amenities="", category="", phone="", website=""} = req.body;
  if (!name || !city || !Number.isFinite(Number(price))) return res.status(400).json({error:"Name, city and price are required."});
  const image = req.file ? `/uploads/${req.file.filename}` : "";
  const result = db.prepare("INSERT INTO hotels(name,city,area,price,rating,amenities,category,phone,website,image) VALUES(?,?,?,?,?,?,?,?,?,?)").run(name,city,area||"",Number(price),Number(rating),amenities,category,phone,website,image);
  res.status(201).json(db.prepare("SELECT * FROM hotels WHERE id=?").get(result.lastInsertRowid));
});

app.patch("/api/hotels/:id", requireAdmin, (req,res) => {
  const fields = ["name","city","area","price","rating","amenities","category","phone","website","active"];
  const updates = fields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field));
  if (!updates.length) return res.status(400).json({error:"No hotel fields to update."});
  const values = updates.map(field => req.body[field]);
  db.prepare(`UPDATE hotels SET ${updates.map(field => `${field}=?`).join(", ")} WHERE id=?`).run(...values, req.params.id);
  res.json(db.prepare("SELECT * FROM hotels WHERE id=?").get(req.params.id));
});

app.post("/api/hotels/:id/image", requireAdmin, upload.single("image"), (req,res) => {
  if (!req.file) return res.status(400).json({error:"Choose a JPG, PNG or WebP image."});
  const hotel = db.prepare("SELECT image FROM hotels WHERE id=?").get(req.params.id);
  if (!hotel) return res.status(404).json({error:"Hotel not found."});
  if (hotel.image) fs.unlink(path.join(uploadsDir, path.basename(hotel.image)), () => {});
  const image = `/uploads/${req.file.filename}`;
  db.prepare("UPDATE hotels SET image=? WHERE id=?").run(image, req.params.id);
  res.json(db.prepare("SELECT * FROM hotels WHERE id=?").get(req.params.id));
});

app.delete("/api/hotels/:id/image", requireAdmin, (req,res) => {
  const hotel = db.prepare("SELECT image FROM hotels WHERE id=?").get(req.params.id);
  if (!hotel) return res.status(404).json({error:"Hotel not found."});
  if (hotel.image) fs.unlink(path.join(uploadsDir, path.basename(hotel.image)), () => {});
  db.prepare("UPDATE hotels SET image='' WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.delete("/api/hotels/:id", requireAdmin, (req,res) => {
  const hotel = db.prepare("SELECT image FROM hotels WHERE id=?").get(req.params.id);
  const remove = db.transaction(id => {
    db.prepare("DELETE FROM room_categories WHERE hotel_id=?").run(id);
    return db.prepare("DELETE FROM hotels WHERE id=?").run(id).changes;
  });
  if (!remove(req.params.id)) return res.status(404).json({error:"Hotel not found."});
  if (hotel?.image) fs.unlink(path.join(uploadsDir, path.basename(hotel.image)), () => {});
  res.json({ok:true});
});

app.post("/api/rooms", requireAdmin, (req,res) => {
  const {hotel_id, name, description="", price, max_guests=2, inventory=1, amenities=""} = req.body;
  if (!hotel_id || !name || !Number.isFinite(Number(price))) return res.status(400).json({error:"Hotel, room name and price are required."});
  const result = db.prepare("INSERT INTO room_categories(hotel_id,name,description,price,max_guests,inventory,amenities) VALUES(?,?,?,?,?,?,?)").run(hotel_id,name,description,Number(price),Number(max_guests),Number(inventory),amenities);
  res.status(201).json(db.prepare("SELECT * FROM room_categories WHERE id=?").get(result.lastInsertRowid));
});

app.patch("/api/rooms/:id", requireAdmin, (req,res) => {
  const fields = ["name","description","price","max_guests","inventory","amenities","active"];
  const updates = fields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field));
  if (!updates.length) return res.status(400).json({error:"No room fields to update."});
  db.prepare(`UPDATE room_categories SET ${updates.map(field => `${field}=?`).join(", ")} WHERE id=?`).run(...updates.map(field => req.body[field]), req.params.id);
  res.json(db.prepare("SELECT * FROM room_categories WHERE id=?").get(req.params.id));
});

app.delete("/api/rooms/:id", requireAdmin, (req,res) => {
  const result = db.prepare("DELETE FROM room_categories WHERE id=?").run(req.params.id);
  if (!result.changes) return res.status(404).json({error:"Room category not found."});
  res.json({ok:true});
});

app.patch("/api/settings", requireAdmin, (req,res) => {
  const update = db.prepare("INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  const save = db.transaction(settings => Object.entries(settings).forEach(([key,value]) => {
    if (Object.prototype.hasOwnProperty.call(defaultSettings,key)) update.run(key,String(value));
  }));
  save(req.body);
  res.json(Object.fromEntries(db.prepare("SELECT key,value FROM site_settings").all().map(item => [item.key,item.value])));
});

app.listen(PORT, () => console.log(`GoLocation running at http://localhost:${PORT}`));
