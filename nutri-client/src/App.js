import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Lista de objetivos. Añadido 'nombreBD' para que coincida exactamente con tu backend, 
// manteniendo 'nombre' para que se vea bonito en la interfaz.
const objetivosDisponibles = [
  { id: 'piel', icono: '✨', nombreBD: 'Piel menos grasa', nombre: 'Cuidado de Piel', desc: 'Alimentos ricos en vitaminas para un cutis radiante.' },
  { id: 'musculo', icono: '💪', nombreBD: 'Musculo', nombre: 'Ganar Músculo', desc: 'Dietas altas en proteína y carbohidratos complejos.' },
  { id: 'peso', icono: '⚖️', nombreBD: 'Control de Peso', nombre: 'Control de Peso', desc: 'Déficit calórico con alta saciedad.' },
  { id: 'energia', icono: '⚡', nombreBD: 'Energia', nombre: 'Más Energía', desc: 'Evita la fatiga con alimentos energéticos naturales.' },
  { id: 'digestion', icono: '🌿', nombreBD: 'Digestion', nombre: 'Mejor Digestión', desc: 'Alto contenido en fibra y probióticos.' },
  { id: 'corazon', icono: '❤️', nombreBD: 'Corazon', nombre: 'Salud Cardiovascular', desc: 'Grasas saludables y reducción de sodio.' }
];

function App() {
  // =========================================
  // 1. ESTADOS Y REFERENCIAS
  // =========================================
  const [pagina, setPagina] = useState('carga');
  const [progreso, setProgreso] = useState(0);
  const [dieta, setDieta] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [credenciales, setCredenciales] = useState({ email: '', password: '', nombre: '' });
  const [esRegistro, setEsRegistro] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [verPassword, setVerPassword] = useState(false);
  const [alacena, setAlacena] = useState([]); 
  const [alimentosDisponibles, setAlimentosDisponibles] = useState([]); 
  const [subPestañaAlacena, setSubPestañaAlacena] = useState('ver'); 
  
  // Estados para el buscador de dietas
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [objetivoActual, setObjetivoActual] = useState(null);
  
  // Estados para el buscador de Recetas
  const [busquedaReceta, setBusquedaReceta] = useState("");
  const [objetivoSeleccionadoReceta, setObjetivoSeleccionadoReceta] = useState(null);

  // REFERENCIAS PARA CONTROL DE TIEMPO
  const prevPaginaRef = useRef(pagina);
  const tiempoSalidaDieta = useRef(null);
  const tiempoSalidaRecetas = useRef(null);

  // =========================================
  // 2. EFECTOS
  // =========================================

  // Persistencia de sesión y carga de alacena al inicio
  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuarioNutriHeart');
    if (sesionGuardada) {
      const usuarioLogueado = JSON.parse(sesionGuardada);
      setUsuario(usuarioLogueado);
      cargarAlacenaUsuario(usuarioLogueado.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulación de barra de carga
  useEffect(() => {
    if (pagina === 'carga') {
      const timer = setInterval(() => {
        setProgreso((prev) => {
          if (prev >= 100) { 
            clearInterval(timer); 
            return 100; 
          }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(timer);
    }
  }, [pagina]);

  // Salto automático a Inicio cuando termina la carga
  useEffect(() => {
    if (progreso === 100) {
      const timeout = setTimeout(() => setPagina('inicio'), 500);
      return () => clearTimeout(timeout);
    }
  }, [progreso]);

  // Cargar lista de alimentos al entrar a "Alacena" (Solo 1 vez)
  useEffect(() => {
    if (pagina === 'alacena' && alimentosDisponibles.length === 0) {
      cargarAlimentosBD();
    }
  }, [pagina, alimentosDisponibles.length]);

  // EFECTO: Control de tiempo de inactividad por pestaña
  useEffect(() => {
    const prevPagina = prevPaginaRef.current;
    const ahora = Date.now();

    // 1. Registrar el momento en que salimos de una pestaña de búsqueda
    if (prevPagina === 'dieta' && pagina !== 'dieta') {
      tiempoSalidaDieta.current = ahora;
    } else if (prevPagina === 'recetas' && pagina !== 'recetas') {
      tiempoSalidaRecetas.current = ahora;
    }

    // 2. Comprobar cuánto tiempo pasó al volver a una pestaña
    if (pagina === 'dieta' && tiempoSalidaDieta.current) {
      const tiempoFuera = ahora - tiempoSalidaDieta.current;
      if (tiempoFuera > 30000) { // 30,000 ms = 30 segundos
        setTerminoBusqueda('');
        setObjetivoActual(null);
        setDieta([]);
      }
      tiempoSalidaDieta.current = null; // Reiniciamos el contador de esta pestaña
    } 
    else if (pagina === 'recetas' && tiempoSalidaRecetas.current) {
      const tiempoFuera = ahora - tiempoSalidaRecetas.current;
      if (tiempoFuera > 30000) { // 30,000 ms = 30 segundos
        setBusquedaReceta('');
        setObjetivoSeleccionadoReceta(null);
        setRecetas([]);
      }
      tiempoSalidaRecetas.current = null; // Reiniciamos el contador de esta pestaña
    }

    // 3. Actualizamos la referencia para el próximo cambio de pestaña
    prevPaginaRef.current = pagina;
  }, [pagina]);

  // EFECTO: Obtener dieta automáticamente al escribir (sin hacer clic)
  useEffect(() => {
    if (objetivoActual) return;

    if (terminoBusqueda.trim() !== '') {
      const objetivoEmparejado = objetivosDisponibles.find(obj => 
        obj.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        obj.desc.toLowerCase().includes(terminoBusqueda.toLowerCase())
      );

      if (objetivoEmparejado) {
        obtenerDieta(objetivoEmparejado.nombreBD);
      } else {
        setDieta([]); 
      }
    } else {
      setDieta([]); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminoBusqueda, objetivoActual]);

  // EFECTO: Obtener RECETAS automáticamente al escribir (sin hacer clic)
  useEffect(() => {
    if (objetivoSeleccionadoReceta) return;

    if (busquedaReceta.trim() !== '') {
      const objetivoEmparejado = objetivosDisponibles.find(obj => 
        obj.nombre.toLowerCase().includes(busquedaReceta.toLowerCase()) ||
        obj.desc.toLowerCase().includes(busquedaReceta.toLowerCase())
      );

      if (objetivoEmparejado) {
        obtenerRecetas(objetivoEmparejado.nombreBD);
      } else {
        setRecetas([]); 
      }
    } else {
      setRecetas([]); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaReceta, objetivoSeleccionadoReceta]);


  // =========================================
  // 3. FUNCIONES DE LÓGICA Y API
  // =========================================

  const mostrarNotificacion = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 6000);
  };

  const manejarCambio = (e) => {
    setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
  };

  // -- Peticiones Backend --
  const cargarAlacenaUsuario = async (email) => {
    try {
      const respuesta = await fetch(`http://localhost:3000/alacena/${email}`);
      if (respuesta.ok) {
        const datosAlacena = await respuesta.json();
        setAlacena(datosAlacena);
      }
    } catch (error) {
      console.error("Error al cargar la alacena del usuario:", error);
    }
  };

  const guardarAlacenaEnBD = async (nuevaAlacena) => {
    if (!usuario) return;
    try {
      await fetch(`http://localhost:3000/alacena/${usuario.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alacena: nuevaAlacena })
      });
    } catch (error) {
      console.error("Error al guardar la alacena en la BD:", error);
    }
  };

  const obtenerDieta = async (objetivo) => {
    try {
      const respuesta = await fetch(`http://localhost:3000/dieta/${encodeURIComponent(objetivo)}`);
      const datos = await respuesta.json();
      setDieta(datos);
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
    }
  };

  const obtenerRecetas = async (objetivo) => {
    try {
      const respuesta = await fetch(`http://localhost:3000/recetas/${encodeURIComponent(objetivo)}`);
      const data = await respuesta.json();
      setRecetas(data);
    } catch (error) {
      console.error("Error al obtener las recetas:", error);
    }
  };

  const cargarAlimentosBD = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/alimentos');
      const data = await response.json();
      setAlimentosDisponibles(data);
    } catch (error) {
      console.error("Error al cargar los alimentos:", error);
    }
  };

  // -- Gestión de la Alacena --
  const agregarAAlacena = (alimento) => {
    if (!usuario) {
      mostrarNotificacion("Inicia sesión para guardar alimentos en tu alacena", "error");
      return;
    }

    const inputCantidad = document.getElementById(`cant-${alimento._id}`);
    const cantidadAñadir = parseInt(inputCantidad.value) || 1;

    setAlacena((alacenaActual) => {
      const existe = alacenaActual.find(item => item._id === alimento._id);
      let nuevaAlacena;

      if (existe) {
        nuevaAlacena = alacenaActual.map(item =>
          item._id === alimento._id
            ? { ...item, cantidad: item.cantidad + cantidadAñadir }
            : item
        );
      } else {
        nuevaAlacena = [...alacenaActual, { ...alimento, cantidad: cantidadAñadir }];
      }

      guardarAlacenaEnBD(nuevaAlacena);
      return nuevaAlacena;
    });

    if (inputCantidad) inputCantidad.value = 1;
    mostrarNotificacion(`Añadido: ${cantidadAñadir} x ${alimento.nombre}`, "exito");
  };

  const eliminarDeAlacena = (id) => {
    setAlacena((alacenaActual) => {
      const nuevaAlacena = alacenaActual.filter(item => item._id !== id);
      guardarAlacenaEnBD(nuevaAlacena);
      return nuevaAlacena;
    });
  };

  // LÓGICA DE FILTRADO PARA DIETAS
  const objetivosFiltrados = objetivosDisponibles.filter(obj => {
    if (objetivoActual) return obj.id === objetivoActual;
    if (terminoBusqueda.trim() !== '') {
      return obj.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
             obj.desc.toLowerCase().includes(terminoBusqueda.toLowerCase());
    }
    return true;
  });

  // LÓGICA DE FILTRADO PARA RECETAS
  const objetivosRecetaFiltrados = objetivosDisponibles.filter(obj => {
    if (objetivoSeleccionadoReceta) return obj.id === objetivoSeleccionadoReceta;
    if (busquedaReceta.trim() !== '') {
      return obj.nombre.toLowerCase().includes(busquedaReceta.toLowerCase()) ||
             obj.desc.toLowerCase().includes(busquedaReceta.toLowerCase());
    }
    return true;
  });

  // -- Autenticación --
  const iniciarSesion = async (e) => {
    e.preventDefault();
    try {
      const respuesta = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credenciales.email, password: credenciales.password })
      });
      
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setUsuario(datos);
        localStorage.setItem('usuarioNutriHeart', JSON.stringify(datos));
        cargarAlacenaUsuario(datos.email);
        setPagina('inicio');
        mostrarNotificacion(`¡Bienvenido de nuevo!`, 'exito');
      } else {
        mostrarNotificacion("Contraseña o correo incorrectos", "error");
      }
    } catch (error) {
      mostrarNotificacion("Error de conexión con el servidor", "error");
    }
  };

  const registrarUsuario = async (e) => {
    e.preventDefault();
    try {
      const respuesta = await fetch('http://localhost:3000/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales)
      });
      if (respuesta.ok) {
        mostrarNotificacion("Cuenta creada con éxito. ¡Ya puedes entrar!", "exito");
        setEsRegistro(false);
      } else {
        mostrarNotificacion("El correo ya está registrado.", "error");
      }
    } catch (error) {
      mostrarNotificacion("Error en registro", "error");
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('usuarioNutriHeart');
    setUsuario(null);
    setAlacena([]); 
    setPagina('inicio');
    mostrarNotificacion("Sesión cerrada", "exito");
  };

  // =========================================
  // 4. RENDERIZADO AISLADO (Pantalla de Carga)
  // =========================================
  if (pagina === 'carga') {
    return (
      <div className="pantalla-carga">
        <div className="contenido-carga">
          <img 
            src="/LogoNH.png" 
            alt="Logo NutriHeart" 
            className="logo-animado" 
            style={{ width: '180px', marginBottom: '15px', borderRadius: '15px' }} 
          />
          <h1 className="titulo-carga">NutriHeart</h1>
          <p className="texto-bienvenida-carga">
            {progreso < 50 ? "Preparando planes increíbles..." : "Cocinando algo saludable..."}
          </p>
          <div className="contenedor-barra">
            <div className="barra-progreso" style={{ width: `${progreso}%` }}></div>
          </div>
          <p className="porcentaje-carga">{progreso}%</p>
        </div>
      </div>
    );
  }

  // =========================================
  // 5. RENDERIZADO PRINCIPAL DE LA APP
  // =========================================
  return (
    <div className="App">
      {/* NAVBAR */}
      <header className="nav-bar">
        <div 
          className="logo-nav" 
          onClick={() => setPagina('inicio')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="/LogoNH.png" alt="Icono" style={{ width: '35px', borderRadius: '8px' }} />
          <h1>NutriHeart</h1>
        </div>
        <div className="botones-nav">
          <button 
            className={pagina === 'inicio' ? 'activo' : ''} 
            onClick={() => setPagina('inicio')}
          >
            Inicio
          </button>
          <button 
            className={pagina === 'dieta' ? 'activo' : ''} 
            onClick={() => setPagina('dieta')}
          >
            Dietas
          </button>
          <button 
            className={pagina === 'recetas' ? 'activo' : ''} 
            onClick={() => setPagina('recetas')}
          >
            Recetas
          </button>
          <button 
            className={pagina === 'alacena' ? 'activo' : ''} 
            onClick={() => setPagina('alacena')}
          >
            Alacena
          </button>
          <button 
            className={pagina === 'login' ? 'activo' : ''} 
            onClick={() => setPagina('login')}
          >
            {usuario ? "Perfil" : "Entrar"}
          </button>
        </div>
      </header>

      <main className="contenido">
        
        {/* SECCIÓN INICIO */}
        {pagina === 'inicio' && (
          <>
            <section className="hero">
              <h2>
                {usuario ? `¡Hola, ${usuario.nombre || usuario.email.split('@')[0]}! 👋` : "Tu camino al bienestar"}
              </h2>
              <p>Analizamos lo que tu cuerpo necesita para brillar desde adentro.</p>
              <button 
                className="btn-grande" 
                onClick={() => setPagina('dieta')}
              >
                {usuario ? "Ver mi recomendación" : "Comenzar ahora"}
              </button>
            </section>
            <section className="seccion-pasos">
              <div className="paso-card">
                <span className="paso-numero">01</span>
                <h3>Regístrate</h3>
                <p>Crea tu perfil personalizado.</p>
              </div>
              <div className="paso-card">
                <span className="paso-numero">02</span>
                <h3>Elige Objetivo</h3>
                <p>Mejora tu salud hoy.</p>
              </div>
              <div className="paso-card">
                <span className="paso-numero">03</span>
                <h3>¡Logra Metas!</h3>
                <p>Transforma tu vida.</p>
              </div>
            </section>
          </>
        )}

        {/* SECCIÓN DIETAS */}
        {pagina === 'dieta' && (
          <div className="contenedor-buscador">
            <div className="encabezado-dieta">
              <h2>Encuentra tu plan ideal</h2>
              <p>Selecciona tu objetivo actual para ver alimentos recomendados.</p>
            </div>
            
            <div className="buscador-objetivos-contenedor">
              <div className="caja-busqueda">
                <span className="icono-lupa">🔍</span>
                <input
                  type="text"
                  placeholder="Busca un objetivo (ej. músculo, piel, energía)..."
                  value={terminoBusqueda}
                  onChange={(e) => {
                    setTerminoBusqueda(e.target.value);
                    if (objetivoActual) {
                      setObjetivoActual(null);
                    }
                  }}
                  onFocus={() => {
                    if (objetivoActual) {
                      setObjetivoActual(null);
                      setDieta([]); 
                    }
                  }}
                  className="input-busqueda-objetivo"
                />
              </div>

              <div className="lista-objetivos">
                {objetivosFiltrados.length > 0 ? (
                  objetivosFiltrados.map((obj) => (
                    <div
                      key={obj.id}
                      className={`item-objetivo ${objetivoActual === obj.id ? 'activo' : ''}`}
                      onClick={() => {
                        if (objetivoActual === obj.id) {
                          setObjetivoActual(null);
                          setDieta([]); 
                        } else {
                          setObjetivoActual(obj.id);
                          setTerminoBusqueda(''); 
                          obtenerDieta(obj.nombreBD); 
                        }
                      }}
                    >
                      <div className="item-objetivo-info">
                        <h4>{obj.icono} {obj.nombre}</h4>
                        <p>{obj.desc}</p>
                      </div>
                      {objetivoActual === obj.id && (
                        <span className="etiqueta-activa">Seleccionado</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="item-objetivo-vacio">
                    No se encontraron objetivos con "{terminoBusqueda}"
                  </div>
                )}
              </div>
            </div>

            <div className="resultados">
              {dieta.length > 0 ? (
                dieta.map((alimento) => (
                  <div key={alimento._id} className="tarjeta-alimento">
                    <div className="contenedor-foto">
                      <img 
                        src={alimento.imagen || "/placeholder.png"} 
                        alt={alimento.nombre} 
                        className="foto-alimento" 
                      />
                    </div>
                    <div className="info-alimento">
                      <h3>{alimento.nombre}</h3>
                      <p><strong>Beneficio:</strong> {alimento.beneficio}</p>
                      <div className="stats-nutricionales">
                        <div className="stat-item">
                          🔥 <span>{alimento.calorias || 0} kcal</span>
                        </div>
                        <div className="stat-item">
                          🍗 <span>{alimento.proteinas || 0}g Prot</span>
                        </div>
                        <div className="stat-item">
                          🥑 <span>{alimento.grasas || 0}g Grasas</span>
                        </div>
                        <div className="stat-item">
                          🍬 <span>{alimento.azucares || 0}g Azúcar</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="mensaje-vacio">Busca y selecciona un objetivo para cargar alimentos.</p>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN RECETAS */}
        {pagina === 'recetas' && (
          <div className="contenedor-recetas">
            <div className="encabezado-recetas">
              <h2>Recetas de cocina saludable</h2>
              <p>Aprende a preparar tus propios platos según tu meta.</p>
            </div>
            
            <div className="buscador-objetivos-contenedor">
              <div className="caja-busqueda">
                <span className="icono-lupa">🔍</span>
                <input
                  type="text"
                  placeholder="Busca un objetivo para tus recetas..."
                  value={busquedaReceta}
                  onChange={(e) => {
                    setBusquedaReceta(e.target.value);
                    if (objetivoSeleccionadoReceta) {
                      setObjetivoSeleccionadoReceta(null);
                    }
                  }}
                  onFocus={() => {
                    if (objetivoSeleccionadoReceta) {
                      setObjetivoSeleccionadoReceta(null);
                      setRecetas([]); 
                    }
                  }}
                  className="input-busqueda-objetivo"
                />
              </div>

              <div className="lista-objetivos">
                {objetivosRecetaFiltrados.length > 0 ? (
                  objetivosRecetaFiltrados.map((obj) => (
                    <div
                      key={obj.id}
                      className={`item-objetivo ${objetivoSeleccionadoReceta === obj.id ? 'activo' : ''}`}
                      onClick={() => {
                        if (objetivoSeleccionadoReceta === obj.id) {
                          setObjetivoSeleccionadoReceta(null);
                          setRecetas([]); 
                        } else {
                          setObjetivoSeleccionadoReceta(obj.id);
                          setBusquedaReceta(''); 
                          obtenerRecetas(obj.nombreBD); 
                        }
                      }}
                    >
                      <div className="item-objetivo-info">
                        <h4>{obj.icono} {obj.nombre}</h4>
                        <p>{obj.desc}</p>
                      </div>
                      {objetivoSeleccionadoReceta === obj.id && (
                        <span className="etiqueta-activa">Seleccionado</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="item-objetivo-vacio">
                    No se encontraron objetivos con "{busquedaReceta}"
                  </div>
                )}
              </div>
            </div>

            <div className="lista-recetas">
              {recetas.length > 0 ? (
                recetas.map((receta, index) => (
                  <div key={index} className="tarjeta-receta-completa">
                    <h3>{receta.nombre}</h3>
                    <div className="bloque-pasos">
                      <h4>🥣 Preparación:</h4>
                      <ol>
                        {receta.pasos.map((paso, i) => (
                          <li key={i}>{paso}</li>
                        ))}
                      </ol>
                    </div>
                    <h4>🍎 Ingredientes necesarios:</h4>
                    <div className="grid-ingredientes">
                      {receta.ingredientesCompletos.map((ing, i) => (
                        <div key={i} className="mini-tarjeta-detallada">
                          <div className="mini-header">
                            <strong>{ing.nombre}</strong>
                            <span className="mini-kcal">{ing.calorias || 0} kcal</span>
                          </div>
                          <div className="mini-stats-grid">
                            <span>P: {ing.proteinas || 0}g</span>
                            <span>G: {ing.grasas || 0}g</span>
                            <span>A: {ing.azucares || 0}g</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="mensaje-vacio">Busca y selecciona un objetivo para cargar recetas.</p>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN ALACENA */}
        {pagina === 'alacena' && (
          <div className="contenedor-alacena">
            <div className="encabezado-alacena">
              <h2>Mi Alacena</h2>
              <p>Gestiona los ingredientes que tienes en casa.</p>
            </div>

            <div className="selectores-modernos">
              <button
                className={`btn-objetivo ${subPestañaAlacena === 'ver' ? 'activo' : ''}`}
                onClick={() => setSubPestañaAlacena('ver')}
              >
                📦 Ver mi alacena
              </button>
              <button
                className={`btn-objetivo ${subPestañaAlacena === 'añadir' ? 'activo' : ''}`}
                onClick={() => setSubPestañaAlacena('añadir')}
              >
                ➕ Añadir alimentos
              </button>
            </div>

            <div className="contenido-subpestaña">
              {subPestañaAlacena === 'ver' ? (
                <div className="grid-mi-alacena">
                  {alacena.length > 0 ? (
                    alacena.map((item) => (
                      <div key={item._id} className="tarjeta-mini-alacena">
                        <button 
                          className="btn-eliminar-mini" 
                          onClick={() => eliminarDeAlacena(item._id)}
                        >
                          🗑️
                        </button>
                        <span className="badge-cantidad">{item.cantidad}</span>
                        <img 
                          src={item.imagen || 'https://via.placeholder.com/150?text=Sin+Imagen'} 
                          alt={item.nombre} 
                        />
                        <h4>{item.nombre}</h4>
                      </div>
                    ))
                  ) : (
                    <div className="alacena-vacia">
                      <p>Tu alacena está vacía. ¡Ve a "Añadir alimentos" para llenarla!</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid-mi-alacena">
                  {alimentosDisponibles.length > 0 ? (
                    alimentosDisponibles.map((alimento) => (
                      <div key={alimento._id} className="tarjeta-mini-alacena">
                        <img 
                          src={alimento.imagen || 'https://via.placeholder.com/150?text=Sin+Imagen'} 
                          alt={alimento.nombre} 
                        />
                        <h4>{alimento.nombre}</h4>
                        <div className="controles-alacena">
                          <input 
                            type="number" 
                            min="1" 
                            defaultValue="1" 
                            id={`cant-${alimento._id}`} 
                            className="input-cantidad" 
                          />
                          <button 
                            className="btn-añadir" 
                            onClick={() => agregarAAlacena(alimento)}
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>Cargando alimentos de la base de datos...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN LOGIN / PERFIL */}
        {pagina === 'login' && (
          <section className="contenedor-seccion-usuario">
            {mensaje.texto && (
              <div className={`alerta-flotante ${mensaje.tipo}`}>
                {mensaje.texto}
              </div>
            )}
            
            {!usuario ? (
              <div className="caja-login">
                <h2>{esRegistro ? "Crear Cuenta" : "Iniciar Sesión"}</h2>

                <form onSubmit={esRegistro ? registrarUsuario : iniciarSesion}>
                  {esRegistro && (
                    <input
                      type="text"
                      name="nombre"
                      placeholder="Nombre completo"
                      onChange={manejarCambio}
                      required
                    />
                  )}
                  <input
                    type="email"
                    name="email"
                    placeholder="Correo electrónico"
                    onChange={manejarCambio}
                    required
                  />
                  <div className="input-password-container">
                    <input
                      type={verPassword ? "text" : "password"}
                      name="password"
                      placeholder="Contraseña"
                      onChange={manejarCambio}
                      required
                    />
                    <span 
                      className="toggle-password" 
                      onClick={() => setVerPassword(!verPassword)}
                    >
                      {verPassword ? "🔓" : "👁️"}
                    </span>
                  </div>

                  <button type="submit" className="btn-primario">
                    {esRegistro ? "Registrarme ahora" : "Entrar a mi cuenta"}
                  </button>
                </form>

                <p 
                  className="texto-cambio" 
                  onClick={() => setEsRegistro(!esRegistro)}
                >
                  {esRegistro ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nuevo? Regístrate aquí"}
                </p>
              </div>
            ) : (
              <div className="contenedor-perfil">
                <div className="perfil-header">
                  <div className="avatar-circulo">
                    {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : "U"}
                  </div>
                  <h2>¡Qué gusto verte, {usuario.nombre || 'NutriUser'}!</h2>
                  <p className="usuario-email">{usuario.email}</p>
                </div>

                <div className="perfil-stats">
                  <div className="stat-card">
                    <span className="stat-icon">🥗</span>
                    <h4>Mi Objetivo</h4>
                    <p>Saludable</p>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">🔥</span>
                    <h4>Estado</h4>
                    <p>Activo</p>
                  </div>
                </div>

                <div className="perfil-acciones">
                  <button 
                    className="btn-perfil secundario" 
                    onClick={() => setPagina('dieta')}
                  >
                    Ir a mis dietas
                  </button>
                  <button 
                    className="btn-perfil peligro" 
                    onClick={cerrarSesion}
                  >
                    Cerrar sesión segura
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="footer-moderno">
        <div className="footer-contenido">
          <div className="footer-logo">
            <h3>NutriHeart</h3>
            <p>Salud inteligente.</p>
          </div>
          <div className="footer-links">
            <h4>Menú</h4>
            <p onClick={() => setPagina('inicio')}>Inicio</p>
            <p onClick={() => setPagina('dieta')}>Dietas</p>
            <p onClick={() => setPagina('recetas')}>Recetas</p>
          </div>
          <div className="footer-contacto">
            <h4>Ayuda</h4>
            <p>nutriheart@gmail.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 NutriHeart</p>
        </div>
      </footer>
    </div>
  );
}

export default App;