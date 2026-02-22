import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("psychology.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    full_name TEXT
  );

  CREATE TABLE IF NOT EXISTS attentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT,
    grade TEXT,
    date TEXT,
    time TEXT,
    reason TEXT,
    observations TEXT,
    recommendations TEXT,
    psychologist_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (psychologist_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT,
    grade TEXT,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled
    psychologist_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (psychologist_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    type TEXT DEFAULT 'info', -- info, warning, success
    psychologist_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (psychologist_id) REFERENCES users(id)
  );
`);

// Seed user if not exists
const userExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!userExists) {
  db.prepare("INSERT INTO users (username, password, full_name) VALUES (?, ?, ?)").run(
    "admin",
    "admin123",
    "Psic. Principal"
  );
}

// Seed example reminders if table is empty
const remindersCount = db.prepare("SELECT COUNT(*) as count FROM reminders").get() as { count: number };
if (remindersCount.count === 0) {
  const adminUser = db.prepare("SELECT id FROM users WHERE username = ?").get("admin") as { id: number };
  const initialReminders = [
    { title: "Actualización de Expedientes", description: "Recuerda completar las observaciones de las atenciones de la semana pasada.", type: "warning", psychologist_id: adminUser.id },
    { title: "Taller de Convivencia", description: "Preparar materiales para el taller de mañana con 3ro de Secundaria.", type: "info", psychologist_id: adminUser.id }
  ];

  const insertReminder = db.prepare(`
    INSERT INTO reminders (title, description, type, psychologist_id)
    VALUES (?, ?, ?, ?)
  `);

  for (const r of initialReminders) {
    insertReminder.run(r.title, r.description, r.type, r.psychologist_id);
  }
}

// Seed example appointments if table is empty
const appointmentsCount = db.prepare("SELECT COUNT(*) as count FROM appointments").get() as { count: number };
if (appointmentsCount.count === 0) {
  const adminUser = db.prepare("SELECT id FROM users WHERE username = ?").get("admin") as { id: number };
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const appts = [
    { student_name: "Roberto Díaz", grade: "4to Primaria", date: today, time: "08:00", psychologist_id: adminUser.id },
    { student_name: "Lucía Méndez", grade: "2do Secundaria", date: today, time: "10:30", psychologist_id: adminUser.id },
    { student_name: "Kevin Quispe", grade: "5to Secundaria", date: tomorrow, time: "09:00", psychologist_id: adminUser.id }
  ];

  const insertAppt = db.prepare(`
    INSERT INTO appointments (student_name, grade, date, time, psychologist_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const a of appts) {
    insertAppt.run(a.student_name, a.grade, a.date, a.time, a.psychologist_id);
  }
}

// Seed example attentions if table is empty
const attentionsCount = db.prepare("SELECT COUNT(*) as count FROM attentions").get() as { count: number };
if (attentionsCount.count === 0) {
  const adminUser = db.prepare("SELECT id FROM users WHERE username = ?").get("admin") as { id: number };
  const examples = [
    {
      student_name: "Juan Pérez García",
      grade: "5to Primaria A",
      date: "2026-02-15",
      time: "09:30",
      reason: "Dificultades de concentración en clase de matemáticas.",
      observations: "El alumno se muestra distraído y con ansiedad ante exámenes.",
      recommendations: "Técnicas de respiración y apoyo pedagógico adicional.",
      psychologist_id: adminUser.id
    },
    {
      student_name: "María Rodríguez López",
      grade: "3ro Secundaria B",
      date: "2026-02-18",
      time: "11:00",
      reason: "Problemas de convivencia con sus compañeros.",
      observations: "Se identifica un conflicto grupal por malentendidos en redes sociales.",
      recommendations: "Taller de habilidades sociales y mediación escolar.",
      psychologist_id: adminUser.id
    },
    {
      student_name: "Carlos Mendoza Soto",
      grade: "1ro Secundaria C",
      date: "2026-02-19",
      time: "14:15",
      reason: "Bajo rendimiento académico en el primer bimestre.",
      observations: "Falta de hábitos de estudio y desmotivación escolar.",
      recommendations: "Establecer un horario de estudio en casa y seguimiento semanal.",
      psychologist_id: adminUser.id
    },
    {
      student_name: "Ana Belén Torres",
      grade: "6to Primaria B",
      date: "2026-02-20",
      time: "10:45",
      reason: "Orientación vocacional temprana.",
      observations: "La alumna muestra interés por las artes y ciencias biológicas.",
      recommendations: "Explorar perfiles profesionales y participar en ferias de ciencias.",
      psychologist_id: adminUser.id
    }
  ];

  const insert = db.prepare(`
    INSERT INTO attentions (student_name, grade, date, time, reason, observations, recommendations, psychologist_id)
    VALUES (@student_name, @grade, @date, @time, @reason, @observations, @recommendations, @psychologist_id)
  `);

  for (const example of examples) {
    insert.run(example);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } else {
      res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }
  });

  // Stats API
  app.get("/api/stats", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const totalAttentions = db.prepare("SELECT COUNT(*) as count FROM attentions").get() as any;
    const todayAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE date = ? AND status = 'pending'").get(today) as any;
    res.json({
      totalAttentions: totalAttentions.count,
      todayAppointments: todayAppointments.count
    });
  });

  // Appointments API
  app.get("/api/appointments", (req, res) => {
    const appointments = db.prepare(`
      SELECT * FROM appointments 
      WHERE status = 'pending'
      ORDER BY date ASC, time ASC
    `).all();
    res.json(appointments);
  });

  app.post("/api/appointments", (req, res) => {
    const { student_name, grade, date, time, psychologist_id } = req.body;
    const result = db.prepare(`
      INSERT INTO appointments (student_name, grade, date, time, psychologist_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(student_name, grade, date, time, psychologist_id);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.patch("/api/appointments/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  // Reminders API
  app.get("/api/reminders", (req, res) => {
    const reminders = db.prepare(`
      SELECT * FROM reminders 
      ORDER BY created_at DESC
    `).all();
    res.json(reminders);
  });

  app.post("/api/reminders", (req, res) => {
    const { title, description, type, psychologist_id } = req.body;
    const result = db.prepare(`
      INSERT INTO reminders (title, description, type, psychologist_id)
      VALUES (?, ?, ?, ?)
    `).run(title, description, type, psychologist_id);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.delete("/api/reminders/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Attentions API
  app.get("/api/attentions", (req, res) => {
    const attentions = db.prepare(`
      SELECT a.*, u.full_name as psychologist_name 
      FROM attentions a 
      JOIN users u ON a.psychologist_id = u.id 
      ORDER BY a.date DESC, a.time DESC
    `).all();
    res.json(attentions);
  });

  app.post("/api/attentions", (req, res) => {
    const { student_name, grade, date, time, reason, observations, recommendations, psychologist_id } = req.body;
    const result = db.prepare(`
      INSERT INTO attentions (student_name, grade, date, time, reason, observations, recommendations, psychologist_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(student_name, grade, date, time, reason, observations, recommendations, psychologist_id);
    
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.delete("/api/attentions/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM attentions WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
