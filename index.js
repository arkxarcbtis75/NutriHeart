const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. CONEXIÓN A MONGODB
mongoose.connect('mongodb://127.0.0.1:27017/NutriData')
    .then(() => console.log("¡Conectado a MongoDB con éxito!"))
    .catch(err => console.error("Error al conectar a MongoDB:", err));

// 2. MODELO DE ALIMENTOS
// 2. MODELO DE ALIMENTOS
const Alimento = mongoose.model('Alimento', new mongoose.Schema({
    nombre: String,
    objetivo: String, 
    beneficio: String,
    evitar: Boolean,
    imagen: String,
    calorias: { type: Number, default: 0 }, // kcal por porción/pieza
    proteinas: { type: Number, default: 0 }, // gramos
    grasas: { type: Number, default: 0 },    // gramos
    azucares: { type: Number, default: 0 }   // gramos
}, { collection: 'alimentos' }));

// 3. MODELO DE USUARIOS (¡ACTUALIZADO CON LA ALACENA!)
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nombre: String,
    objetivo: String,
    alacena: { type: Array, default: [] } // <-- Aquí se guardarán los alimentos del usuario
}, { collection: 'usuarios' }));

// 4. MODELO DE RECETAS
const Receta = mongoose.model('Receta', new mongoose.Schema({
    nombre: String,
    objetivo: String,
    pasos: [String], 
    ingredientesNombres: [String] 
}, { collection: 'recetas' }));


// --- RUTAS ---

app.get('/', (req, res) => res.send('Servidor NutriHeart activo.'));

// Buscar Dietas
app.get('/dieta/:objetivoUsuario', async (req, res) => {
    try {
        const objetivoBuscado = req.params.objetivoUsuario;
        console.log(`🔍 Buscando alimentos para: ${objetivoBuscado}`);

        const dietaRecomendada = await Alimento.find({ 
            objetivo: { $regex: new RegExp(`^${objetivoBuscado}$`, 'i') }, 
            evitar: false 
        });
        
        console.log(`✅ Se encontraron ${dietaRecomendada.length} alimentos.`);
        res.json(dietaRecomendada);
    } catch (error) {
        console.error("Error al buscar dieta:", error);
        res.status(500).json({ error: "Error al buscar la dieta" });
    }
});

// Buscar Recetas
app.get('/recetas/:objetivoUsuario', async (req, res) => {
    try {
        const objetivoBuscado = req.params.objetivoUsuario;
        console.log(`🍳 Buscando recetas para: ${objetivoBuscado}`);

        const recetasEncontradas = await Receta.find({ 
            objetivo: { $regex: new RegExp(`^${objetivoBuscado}$`, 'i') } 
        }).lean();

        for (let receta of recetasEncontradas) {
            receta.ingredientesCompletos = await Alimento.find({
                nombre: { $in: receta.ingredientesNombres }
            });
        }
        
        res.json(recetasEncontradas);
    } catch (error) {
        console.error("Error al buscar recetas:", error);
        res.status(500).json({ error: "Error al buscar las recetas" });
    }
});

// NUEVA: Obtener TODOS los alimentos (Para la pestaña de "Añadir a mi alacena")
app.get('/api/alimentos', async (req, res) => {
    try {
        const todosLosAlimentos = await Alimento.find();
        res.json(todosLosAlimentos);
    } catch (error) {
        console.error("Error al cargar alimentos:", error);
        res.status(500).json({ error: "Error al cargar la base de datos de alimentos" });
    }
});

// NUEVA: Obtener la alacena guardada de un usuario
app.get('/alacena/:email', async (req, res) => {
    try {
        const usuario = await Usuario.findOne({ email: req.params.email.toLowerCase() });
        if (usuario) {
            res.json(usuario.alacena || []);
        } else {
            res.status(404).json({ error: "Usuario no encontrado" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al obtener la alacena" });
    }
});

// NUEVA: Guardar/Actualizar la alacena del usuario
app.put('/alacena/:email', async (req, res) => {
    try {
        // Buscamos al usuario y le sobreescribimos su alacena con la nueva lista que mande React
        const usuarioActualizado = await Usuario.findOneAndUpdate(
            { email: req.params.email.toLowerCase() },
            { alacena: req.body.alacena },
            { new: true }
        );
        
        if (usuarioActualizado) {
            res.json({ mensaje: "Alacena guardada con éxito", alacena: usuarioActualizado.alacena });
        } else {
            res.status(404).json({ error: "Usuario no encontrado" });
        }
    } catch (error) {
        console.error("Error al guardar la alacena:", error);
        res.status(500).json({ error: "Error al guardar en la base de datos" });
    }
});

// Registro
app.post('/registrar', async (req, res) => {
    try {
        const nuevoUsuario = new Usuario(req.body);
        await nuevoUsuario.save();
        res.status(201).json({ mensaje: "¡Usuario creado!" });
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(400).json({ error: "Error en el registro o correo ya existente" });
    }
});

// Iniciar Sesión
app.post('/login', async (req, res) => {
    console.log("📩 Datos recibidos en login:", req.body);
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: "Faltan datos de correo o contraseña" });
        }

        const usuario = await Usuario.findOne({ email: email.toLowerCase() });
        
        if (!usuario) {
            console.log("❌ Usuario no encontrado");
            return res.status(401).json({ error: "Correo no registrado" });
        }

        if (usuario.password === password) {
            console.log("Login exitoso:", usuario.nombre);
            res.json(usuario);
        } else {
            console.log("Contraseña incorrecta");
            res.status(401).json({ error: "Contraseña incorrecta" });
        }
    } catch (error) {
        console.error("⚠️ Error en el servidor:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// 4. ENCENDER EL SERVIDOR
app.listen(3000, () => {
    console.log('🚀 Servidor NutriHeart corriendo en http://localhost:3000');
});