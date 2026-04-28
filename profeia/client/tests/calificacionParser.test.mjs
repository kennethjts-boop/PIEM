import test from 'node:test'
import assert from 'node:assert/strict'
import { detectCalificacion } from '../src/lib/calificacionParser.js'

test('detecta calificacion con frase contextual "con" aunque existan otros numeros', () => {
  const score = detectCalificacion('Evalúa a Juan de la Cruz de 2° con 9.5 en proyecto 3')
  assert.equal(score, 9.5)
})

test('prioriza token junto a "calificación" en frases multi-numero', () => {
  const score = detectCalificacion('Registra calificación de Ana del Carmen en 1°B: 8')
  assert.equal(score, 8)
})

test('prioriza expresion final tipo score/10', () => {
  const score = detectCalificacion('En 3er grado, alumno Pedro obtuvo 7/10 en examen')
  assert.equal(score, 7)
})

test('evita tomar grado como calificacion cuando hay score al final', () => {
  const score = detectCalificacion('Calificación de María de los Ángeles para 2°: 10')
  assert.equal(score, 10)
})

test('usa valor por defecto cuando no hay numeros', () => {
  const score = detectCalificacion('Evalúa a Carlos del Río en lectura')
  assert.equal(score, 8)
})
