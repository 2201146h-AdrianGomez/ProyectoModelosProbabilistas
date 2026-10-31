/* Archivo GENERADO por herramientas/generar-ejemplos.js — no editar a mano. */
window.RB = window.RB || {};
window.RB.EJEMPLOS = [
 {
  "id": "ejemplo1",
  "titulo": "Ejemplo 1 · Pasto mojado (3 nodos)",
  "nodos": 3,
  "consulta": {
   "consulta": [
    "Lluvia"
   ],
   "evidencia": {
    "Pasto mojado": "Sí"
   }
  },
  "red": {
   "nombre": "Pasto mojado",
   "descripcion": "Clásico de 3 nodos: la lluvia puede encender el aspersor y ambos mojan el pasto.",
   "nodos": [
    {
     "nombre": "Lluvia",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [],
     "cpt": [
      [
       0.2,
       0.8
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 75
     }
    },
    {
     "nombre": "Aspersor",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Lluvia"
     ],
     "cpt": [
      [
       0.01,
       0.99
      ],
      [
       0.4,
       0.6
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 310
     }
    },
    {
     "nombre": "Pasto mojado",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Aspersor",
      "Lluvia"
     ],
     "cpt": [
      [
       0.99,
       0.01
      ],
      [
       0.9,
       0.1
      ],
      [
       0.8,
       0.2
      ],
      [
       0,
       1
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 545
     }
    }
   ]
  }
 },
 {
  "id": "ejemplo2",
  "titulo": "Ejemplo 2 · Estudiante (4 nodos)",
  "nodos": 4,
  "consulta": {
   "consulta": [
    "Dificultad"
   ],
   "evidencia": {
    "Carta": "Buena"
   }
  },
  "red": {
   "nombre": "Estudiante",
   "descripcion": "La calificación depende de la dificultad del curso y de la preparación; la carta de recomendación depende de la calificación (un nodo con 3 estados).",
   "nodos": [
    {
     "nombre": "Dificultad",
     "estados": [
      "Alta",
      "Baja"
     ],
     "padres": [],
     "cpt": [
      [
       0.4,
       0.6
      ]
     ],
     "posicion": {
      "x": 333,
      "y": 75
     }
    },
    {
     "nombre": "Preparación",
     "estados": [
      "Buena",
      "Mala"
     ],
     "padres": [],
     "cpt": [
      [
       0.7,
       0.3
      ]
     ],
     "posicion": {
      "x": 667,
      "y": 75
     }
    },
    {
     "nombre": "Calificación",
     "estados": [
      "Alta",
      "Media",
      "Baja"
     ],
     "padres": [
      "Dificultad",
      "Preparación"
     ],
     "cpt": [
      [
       0.3,
       0.4,
       0.3
      ],
      [
       0.05,
       0.25,
       0.7
      ],
      [
       0.9,
       0.08,
       0.02
      ],
      [
       0.5,
       0.3,
       0.2
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 310
     }
    },
    {
     "nombre": "Carta",
     "estados": [
      "Buena",
      "Mala"
     ],
     "padres": [
      "Calificación"
     ],
     "cpt": [
      [
       0.9,
       0.1
      ],
      [
       0.6,
       0.4
      ],
      [
       0.01,
       0.99
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 545
     }
    }
   ]
  }
 },
 {
  "id": "ejemplo3",
  "titulo": "Ejemplo 3 · Alarma de la casa (5 nodos)",
  "nodos": 5,
  "consulta": {
   "consulta": [
    "Robo"
   ],
   "evidencia": {
    "Juan llama": "Sí",
    "María llama": "Sí"
   }
  },
  "red": {
   "nombre": "Alarma de la casa",
   "descripcion": "Un robo o un terremoto activan la alarma; los vecinos Juan y María llaman si la oyen.",
   "nodos": [
    {
     "nombre": "Robo",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [],
     "cpt": [
      [
       0.001,
       0.999
      ]
     ],
     "posicion": {
      "x": 333,
      "y": 75
     }
    },
    {
     "nombre": "Terremoto",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [],
     "cpt": [
      [
       0.002,
       0.998
      ]
     ],
     "posicion": {
      "x": 667,
      "y": 75
     }
    },
    {
     "nombre": "Alarma",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Robo",
      "Terremoto"
     ],
     "cpt": [
      [
       0.95,
       0.05
      ],
      [
       0.94,
       0.06
      ],
      [
       0.29,
       0.71
      ],
      [
       0.001,
       0.999
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 310
     }
    },
    {
     "nombre": "Juan llama",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Alarma"
     ],
     "cpt": [
      [
       0.9,
       0.1
      ],
      [
       0.05,
       0.95
      ]
     ],
     "posicion": {
      "x": 333,
      "y": 545
     }
    },
    {
     "nombre": "María llama",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Alarma"
     ],
     "cpt": [
      [
       0.7,
       0.3
      ],
      [
       0.01,
       0.99
      ]
     ],
     "posicion": {
      "x": 667,
      "y": 545
     }
    }
   ]
  }
 },
 {
  "id": "ejemplo4",
  "titulo": "Ejemplo 4 · Auto que no enciende (6 nodos)",
  "nodos": 6,
  "consulta": {
   "consulta": [
    "Batería"
   ],
   "evidencia": {
    "Arranca": "No",
    "Luces": "Tenues"
   }
  },
  "red": {
   "nombre": "Auto que no enciende",
   "descripcion": "El frío debilita la batería; la batería y la gasolina deciden si el auto arranca; las luces delatan el estado de la batería.",
   "nodos": [
    {
     "nombre": "Frío",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [],
     "cpt": [
      [
       0.3,
       0.7
      ]
     ],
     "posicion": {
      "x": 333,
      "y": 75
     }
    },
    {
     "nombre": "Batería",
     "estados": [
      "Buena",
      "Débil"
     ],
     "padres": [
      "Frío"
     ],
     "cpt": [
      [
       0.6,
       0.4
      ],
      [
       0.9,
       0.1
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 232
     }
    },
    {
     "nombre": "Gasolina",
     "estados": [
      "Suficiente",
      "Vacío"
     ],
     "padres": [],
     "cpt": [
      [
       0.9,
       0.1
      ]
     ],
     "posicion": {
      "x": 667,
      "y": 75
     }
    },
    {
     "nombre": "Luces",
     "estados": [
      "Brillan",
      "Tenues"
     ],
     "padres": [
      "Batería"
     ],
     "cpt": [
      [
       0.95,
       0.05
      ],
      [
       0.2,
       0.8
      ]
     ],
     "posicion": {
      "x": 333,
      "y": 388
     }
    },
    {
     "nombre": "Arranca",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Batería",
      "Gasolina"
     ],
     "cpt": [
      [
       0.98,
       0.02
      ],
      [
       0,
       1
      ],
      [
       0.3,
       0.7
      ],
      [
       0,
       1
      ]
     ],
     "posicion": {
      "x": 667,
      "y": 388
     }
    },
    {
     "nombre": "Visita al taller",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Arranca"
     ],
     "cpt": [
      [
       0.05,
       0.95
      ],
      [
       0.8,
       0.2
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 545
     }
    }
   ]
  }
 },
 {
  "id": "ejemplo5",
  "titulo": "Ejemplo 5 · Diagnóstico respiratorio (10 nodos)",
  "nodos": 10,
  "consulta": {
   "consulta": [
    "Cáncer"
   ],
   "evidencia": {
    "Rayos X": "Positivo",
    "Fumador": "Sí"
   }
  },
  "red": {
   "nombre": "Diagnóstico respiratorio",
   "descripcion": "Red didáctica de 10 nodos: hábitos y antecedentes influyen en enfermedades que producen síntomas y resultados de estudios.",
   "nodos": [
    {
     "nombre": "Fumador",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [],
     "cpt": [
      [
       0.3,
       0.7
      ]
     ],
     "posicion": {
      "x": 250,
      "y": 75
     }
    },
    {
     "nombre": "Contaminación",
     "estados": [
      "Alta",
      "Baja"
     ],
     "padres": [],
     "cpt": [
      [
       0.2,
       0.8
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 75
     }
    },
    {
     "nombre": "Viaje",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [],
     "cpt": [
      [
       0.1,
       0.9
      ]
     ],
     "posicion": {
      "x": 750,
      "y": 75
     }
    },
    {
     "nombre": "Bronquitis",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Fumador"
     ],
     "cpt": [
      [
       0.6,
       0.4
      ],
      [
       0.3,
       0.7
      ]
     ],
     "posicion": {
      "x": 250,
      "y": 232
     }
    },
    {
     "nombre": "Cáncer",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Fumador",
      "Contaminación"
     ],
     "cpt": [
      [
       0.05,
       0.95
      ],
      [
       0.03,
       0.97
      ],
      [
       0.02,
       0.98
      ],
      [
       0.001,
       0.999
      ]
     ],
     "posicion": {
      "x": 500,
      "y": 232
     }
    },
    {
     "nombre": "Tuberculosis",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Viaje"
     ],
     "cpt": [
      [
       0.05,
       0.95
      ],
      [
       0.01,
       0.99
      ]
     ],
     "posicion": {
      "x": 750,
      "y": 232
     }
    },
    {
     "nombre": "Anormalidad",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Tuberculosis",
      "Cáncer"
     ],
     "cpt": [
      [
       0.99,
       0.01
      ],
      [
       0.9,
       0.1
      ],
      [
       0.95,
       0.05
      ],
      [
       0.05,
       0.95
      ]
     ],
     "posicion": {
      "x": 667,
      "y": 388
     }
    },
    {
     "nombre": "Rayos X",
     "estados": [
      "Positivo",
      "Negativo"
     ],
     "padres": [
      "Anormalidad"
     ],
     "cpt": [
      [
       0.98,
       0.02
      ],
      [
       0.05,
       0.95
      ]
     ],
     "posicion": {
      "x": 667,
      "y": 545
     }
    },
    {
     "nombre": "Disnea",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Bronquitis",
      "Anormalidad"
     ],
     "cpt": [
      [
       0.9,
       0.1
      ],
      [
       0.8,
       0.2
      ],
      [
       0.7,
       0.3
      ],
      [
       0.1,
       0.9
      ]
     ],
     "posicion": {
      "x": 333,
      "y": 545
     }
    },
    {
     "nombre": "Tos",
     "estados": [
      "Sí",
      "No"
     ],
     "padres": [
      "Bronquitis"
     ],
     "cpt": [
      [
       0.85,
       0.15
      ],
      [
       0.15,
       0.85
      ]
     ],
     "posicion": {
      "x": 333,
      "y": 388
     }
    }
   ]
  }
 }
];
