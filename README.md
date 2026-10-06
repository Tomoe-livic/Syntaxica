# Syntaxica

Riferimento in italiano per HTML, CSS e JavaScript: cerchi per concetto, nome o sinonimo e trovi descrizione, snippet ed esempio eseguibile. Include cronologia, preferiti (★), una sezione Brief per gli appunti e una sezione Progetti per archiviare i tuoi progetti (link, codice o file, con anteprima e voci collegate) e una scheda Esempi con tre progetti già pronti.

## Cosa è e cosa non è
Syntaxica è una guida scelta per chi impara HTML, CSS e JavaScript, non un'enciclopedia. Copre il programma del corso e gli approfondimenti più comuni, in italiano e con esempi eseguibili. Non elenca ogni proprietà e ogni valore possibile (per esempio i singoli valori di `justify-content` stanno nella scheda della proprietà): per l'elenco completo c'è MDN Web Docs. Se cerchi qualcosa che non c'è, l'app lo dice e propone la ricerca su MDN.

## Come aprirlo
Apri `index.html` nel browser (doppio clic). Funziona subito; l'installazione come app e l'uso offline richiedono invece di pubblicarlo online (vedi sotto).

## Struttura
- `index.html` — struttura della pagina
- `style.css` — stile
- `app.js` — logica (ricerca, cronologia, preferiti, Brief, Progetti, esecuzione degli esempi)
- `data/html.js`, `data/css.js`, `data/js.js` — le voci, una per riga
- `data/esempi.js` — i progetti d'esempio (Cronometro, Tractum, Rubrica), con codice e voci collegate
- `manifest.webmanifest`, `sw.js`, `icons/` — parte PWA (installazione e uso offline)

## Pubblicarlo e installarlo come app (PWA)
Un'app installabile deve stare su un indirizzo HTTPS. Il modo più semplice è GitHub Pages:
1. Crea un repository su GitHub e carica il contenuto di questa cartella.
2. In Settings > Pages scegli il ramo `main` e la cartella radice.
3. Apri l'indirizzo che ti viene dato dal telefono.

Per installarla:
- **iPhone (Safari)**: Condividi > Aggiungi alla schermata Home.
- **Android (Chrome)**: menu > Installa app.
- **Computer (Chrome/Edge)**: icona di installazione nella barra dell'indirizzo.

Dopo il primo caricamento funziona anche senza rete. Se modifichi i file, cambia il numero di versione in `sw.js` (`syntaxica-v1.0` > `syntaxica-v.1.1`) per forzare l'aggiornamento.

## Segnalazioni
Se cerchi una voce che non c'è, l'app propone di segnalarla: il pulsante apre una nuova issue su GitHub, già compilata con il termine cercato (serve un account GitHub gratuito). Le issue sono nella scheda Issues del repository.

## Aggiungere una voce
Aggiungi una riga nell'array del file giusto, per esempio in `data/js.js`:

```js
{ nome: "includes()", categoria: "JS", sinonimi: ["contiene"], descrizione: "...", snippet: `...`, correlati: ["indexOf()"], demo: "console" },
```

- `demo: "console"` esegue lo snippet (solo JavaScript senza DOM); `demo: "anteprima"` mostra HTML/CSS dal vivo (per il CSS aggiungi `demoHtml`).
- I nomi in `correlati` devono coincidere con il `nome` di un'altra voce.
- Negli snippet non scrivere mai `</script>` né `<!--`: scrivi `<\/script>` e `<\!--`.
- Se gli snippet usano `display: flex` o `display: grid`, mostrali con il genitore, così funzionano copiati.

## Nota sui dati salvati
Preferiti, cronologia, Brief e Progetti si salvano nel browser, sul singolo dispositivo, con nomi interni che iniziano per `sintassiwada_` (e `syntaxica_` per i Progetti). Lo spazio è limitato (circa 5 MB): per progetti grandi conviene un link.
