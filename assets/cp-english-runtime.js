(() => {
  'use strict';

  if (window.CpEnglishRuntime) return;
  const isEnglish = String(document.documentElement.lang || '').toLowerCase().startsWith('en') || /^\/en(?:\/|$)/.test(location.pathname);
  if (!isEnglish) return;

  if (typeof window.fetch === 'function') {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (typeof input === 'string' && input.startsWith('/search/suggest.json')) input = `/en${input}`;
      else if (typeof Request !== 'undefined' && input instanceof Request && new URL(input.url).pathname === '/search/suggest.json') {
        const url = new URL(input.url);
        url.pathname = `/en${url.pathname}`;
        input = new Request(url, input);
      }
      return nativeFetch(input, init);
    };
  }

  const pairs = [
    ['Suche nach Tischgestellen, Dachzelten & Anhängern…', 'Search table leg systems, rooftop tents & trailers…'],
    ['LAGUN TISCHGESTELL SETS', 'LAGUN TABLE LEG SYSTEMS'],
    ['LAGUN TISCHPLATTEN', 'LAGUN TABLETOPS'],
    ['LAGUN ZUBEHÖR', 'LAGUN ACCESSORIES'],
    ['LAGUN TISCHGESTELL KONFIGURATOR', 'LAGUN TABLE LEG CONFIGURATOR'],
    ['LAGUN B-WARE', 'LAGUN OUTLET'],
    ['DACHTZELTE', 'ROOFTOP TENTS'],
    ['DACHZELTE', 'ROOFTOP TENTS'],
    ['ANHÄNGER', 'TRAILERS'],
    ['MIETRECHNER', 'RENTAL CALCULATOR'],
    ['Mietrechner', 'Rental calculator'],
    ['CAMPINGZUBEHÖR', 'CAMPING ACCESSORIES'],
    ['SHOWROOMS', 'SHOWROOMS'],
    ['SERVICE & HILFE', 'SERVICE & HELP'],
    ['Produkte', 'Products'],
    ['Suche', 'Search'],
    ['Seiten', 'Pages'],
    ['Kollektionen', 'Collections'],
    ['Ratgeber', 'Guides'],
    ['Produkt', 'Product'],
    ['Seite', 'Page'],
    ['Kollektion', 'Collection'],

    ['ab', 'from'],
    ['Ansehen', 'View'],
    ['Einbausituation beschreiben', 'Describe your installation'],
    ['Höhe & Bewegungsraum festlegen', 'Set the height and movement range'],
    ['Farbe & Komponenten wählen', 'Choose the finish and components'],
    ['Schnell orientiert', 'Quick answers'],
    ['Was passt zu deinem', 'What suits your'],
    ['Vorhaben?', 'plans?'],
    ['Die wichtigsten Antworten zu Lagun Tischgestellen, Vermietung und persönlicher Beratung auf einen Blick.', 'Key answers about Lagun table leg systems, rentals and personal advice at a glance.'],
    ['Welches Lagun Tischgestell passt in meinen Camper?', 'Which Lagun table leg system suits my camper?'],
    ['Das hängt von Montagefläche, gewünschter Höhe und Bewegungsraum ab. Der Lagun Konfigurator führt dich Schritt für Schritt zur passenden Kombination.', 'That depends on the mounting surface, desired height and available movement range. The Lagun configurator guides you step by step to the right combination.'],
    ['Lagun konfigurieren', 'Configure your Lagun'],
    ['Kann ich ein Dachzelt erst mieten?', 'Can I rent a rooftop tent before buying?'],
    ['Ja. Wähle deinen Reisezeitraum und probiere das Dachzelt in Ruhe auf deinem eigenen Abenteuer aus.', 'Yes. Choose your travel period and try the rooftop tent on your own adventure.'],
    ['Dachzelt mieten', 'Rent a rooftop tent'],
    ['Wo kann ich die Produkte persönlich ansehen?', 'Where can I see the products in person?'],
    ['In unseren Showrooms in Thüringen und Bayern kannst du ausgewählte Produkte vergleichen und dich persönlich beraten lassen.', 'You can compare selected products and get personal advice at our showrooms in Thuringia and Bavaria.'],
    ['Showrooms entdecken', 'Explore showrooms'],

    ['Dein Lagun zusammenstellen', 'Build your Lagun'],
    ['Wir führen dich durch 4 Bauteile – Schritt für Schritt.', 'We guide you through four components, step by step.'],
    ['Mehr Platz für deinen Alltag.', 'More space for everyday life.'],
    ['Dein Ausbau braucht etwas Bedenkzeit?', 'Need more time to plan your conversion?'],
    ['Konfiguration speichern & teilen', 'Save & share configuration'],
    ['Merke dir deinen Zwischenstand, besprich ihn mit deiner Reisebegleitung oder lade eine gespeicherte Auswahl. Preise und Verfügbarkeit prüfen wir beim Laden neu.', 'Save your progress, discuss it with your travel companion or load a saved selection. Prices and availability are checked again when loading.'],
    ['Auf diesem Gerät speichern', 'Save on this device'],
    ['Link teilen ↗', 'Share link ↗'],
    ['Datei herunterladen ↓', 'Download file ↓'],
    ['Konfiguration hochladen ↑', 'Upload configuration ↑'],
    ['Gespeicherte Auswahl laden', 'Load saved selection'],
    ['Dein Link zum Weitergeben', 'Your shareable link'],
    ['Dateien enthalten auch deine Anpassungswünsche. Im geteilten Link lassen wir deine Freitextangaben weg.', 'Downloaded files include your customisation details. Free-text details are omitted from shared links.'],
    ['ZUERST DER LOOK', 'CHOOSE THE FINISH FIRST'],
    ['Silber', 'Silver'],
    ['Schwarz', 'Black'],
    ['Die Bauteile unten zeigen zunächst Silber. Entscheide dich jetzt oder vergleiche später.', 'The components below are initially shown in silver. Choose now or compare the finishes later.'],
    ['01 Befestigung', '01 Mount'],
    ['02 Bein', '02 Table leg'],
    ['03 Arm', '03 Lagun arm'],
    ['04 Untertischplatte', '04 Under-table plate'],
    ['05 Tischplatte', '05 Tabletop'],
    ['06 Anpassung', '06 Customisation'],
    ['Wie viel Platz hast du an der Wand?', 'How much wall space is available?'],
    ['Mehr Abstand zur Wand.', 'More clearance from the wall.'],
    ['Mehr Platz zum Schwenken.', 'More room to swivel.'],
    ['BRAUCHE ICH EINEN GAP?', 'DO I NEED A GAP SPACER?'],
    ['Wie werden GAP, Platte und Bein verbunden?', 'How are the GAP spacer, mounting plate and table leg connected?'],
    ['Passenden GAP ergänzen', 'Add the matching GAP spacer'],
    ['Standard zur Standard-Platte · GAP klein zur Smart-Platte', 'Standard GAP for the standard plate · compact GAP for the Smart plate'],
    ['Lieber bündig oder aufgesetzt?', 'Flush or surface mounted?'],
    ['Gut zu wissen:', 'Good to know:'],
    ['Bei Bodenmontage entfällt die Höhenverstellung. Passende Schrauben für deinen tragfähigen Bodenaufbau besorgst du separat.', 'Floor mounting provides a fixed height. Obtain suitable fasteners for your structurally sound floor separately.'],
    ['Weitere Produktdetails', 'More product details'],
    ['Produktseite mit allen Bildern öffnen ↗', 'Open the product page with all images ↗'],
    ['Optional', 'Optional'],
    ['Ich verwende meine eigene Tischplatte', 'I am using my own tabletop'],
    ['Keine zusätzliche Platte ergänzen', 'Do not add a tabletop'],
    ['GRIFF IM WEG ODER SONDERMASS?', 'HANDLE IN THE WAY OR A CUSTOM LENGTH?'],
    ['Dein Lagun passend machen.', 'Customise your Lagun.'],
    ['Griffe umsetzen oder Bein kürzen: Deine Wünsche gibst du im nächsten Schritt direkt an.', 'Reverse handles or shorten the table leg: enter your requirements in the next step.'],
    ['PASSEND FÜR DEINEN EINBAU', 'MATCHED TO YOUR INSTALLATION'],
    ['Beispiele: Wann hilft eine Anpassung?', 'Examples: when is customisation useful?'],
    ['Optional · deine Angaben werden zusammen mit dem Service im Warenkorb gespeichert.', 'Optional · your details are saved with the service item in the cart.'],
    ['So lassen', 'Leave as is'],
    ['Griff umdrehen', 'Reverse handle'],
    ['Ich möchte eine kürzere Metalllänge als bei meinem gewählten Bein.', 'I need a shorter metal length than the selected table leg.'],
    ['Alle Details zum Anpassungsservice ↗', 'All customisation service details ↗'],
    ['Foto schicken und Einbau besprechen ↗', 'Send a photo and discuss your installation ↗'],
    ['Auswahl ansehen ↑', 'View selection ↑'],
    ['STÜCK FÜR STÜCK', 'STEP BY STEP'],
    ['Dein Tisch. Deine Auswahl.', 'Your table. Your selection.'],
    ['Dein Look', 'Your finish'],
    ['Wähle deine Bauteile – wir behalten den Überblick.', 'Choose your components – we will keep track.'],
    ['Tischplatte auswählen →', 'Choose a tabletop →'],
    ['Jetzt ergänzen', 'Add now'],
    ['Bestandteile & Einzelpreise ansehen', 'View components & individual prices'],
    ['Neu gewählte Artikel werden jeweils einmal ergänzt. Vorhandene Warenkorbteile kosten hier nichts zusätzlich.', 'Each newly selected item is added once. Components already in your cart do not add to this total.'],
    ['Inkl. MwSt. ·', 'VAT included ·'],
    ['Versand im Checkout', 'Shipping calculated at checkout'],
    ['Zum Warenkorb hinzufügen', 'Add to cart'],
    ['Direkt zur Kasse →', 'Go directly to checkout →'],
    ['Mit deiner Auswahl und den übrigen Warenkorbartikeln.', 'With your selection and the other items in your cart.'],
    ['kauften eine ähnliche Gestellkombination', 'bought a similar table leg system'],
    ['Verglichen mit:', 'Compared with:'],
    ['Gezählt werden Kunden mit diesen Bauteilen in ihrer zusammengefassten Kaufhistorie. Tischplatten und Anpassungsservice gehören nicht zum Vergleich.', 'This counts customers who purchased these components across their order history. Tabletops and customisation services are excluded from the comparison.'],
    ['Foto oder Maße schicken – wir beraten dich. ↗', 'Send a photo or measurements – we will advise you. ↗'],
    ['Bitte aktiviere JavaScript für die gemeinsame Konfiguration. Alle Teile findest du auch in unserer', 'Please enable JavaScript to use the configurator. You can also find all components in our'],
    ['Lagun-Übersicht', 'Lagun overview'],

    ['Befestigung', 'Mount'],
    ['Bein', 'Table leg'],
    ['Untertischplatte', 'Under-table mounting plate'],
    ['Tischplatte', 'Tabletop'],
    ['Anpassungsservice', 'Customisation service'],
    ['Griff am Bein', 'Table-leg handle'],
    ['Griff am Arm', 'Arm handle'],
    ['Fertige Metalllänge', 'Finished metal length'],
    ['Deine Angaben', 'Your details'],
    ['Bezug Bein', 'Related table leg'],
    ['Bezug Arm', 'Related arm'],
    ['Unverändert', 'Unchanged'],
    ['Auf die gegenüberliegende Seite', 'Move to the opposite side'],
    ['mm, ohne Kunststoffbolzen', 'mm, excluding the plastic pin'],
    ['Noch nicht gewählt', 'Not selected yet'],
    ['Variante', 'Variant'],
    [' aus ', ' from '],
    ['Bodenadapter', 'Floor mount'],
    ['Wandplatte', 'Wall mounting plate'],
    ['Dreh-/Klappachse', 'Rotating/tilting mount'],
    ['Eiche modern', 'Modern oak'],
    ['Fichte / Kiefer', 'Spruce / pine'],
    ['Betonoptik', 'Concrete look'],
    ['Eiche hell', 'Light oak'],
    ['Pappelholz · Weiß', 'Poplar wood · white'],
    ['Ponga · Eiche', 'Ponga · oak'],
    ['Verfügbar', 'Available'],
    ['Aktuell ausverkauft', 'Currently sold out'],
    ['In dieser Farbe nicht erhältlich', 'Not available in this finish'],
    ['Vorbestellbar', 'Available for pre-order'],
    ['Liefertermin auf Produktseite', 'See the product page for the delivery date'],
    ['Kunden', 'customers'],
    ['Warenkorb prüfen', 'Check cart'],
    ['Warenkorb wird geprüft …', 'Checking cart …'],
    ['Bitte Farbe wählen', 'Please choose a finish'],
    ['Ausführung nicht verfügbar', 'Configuration unavailable'],
    ['Bereits im Warenkorb', 'Already in cart'],
    ['Anpassungswünsche vervollständigen', 'Complete customisation details'],
    ['Wird geprüft …', 'Checking …'],
    ['Grundbauteil', 'core component'],
    ['Grundbauteile', 'core components'],
    ['neue Artikel', 'new items'],
    ['Eigene Tischplatte', 'Own tabletop'],
    ['Keine zusätzliche Platte ergänzen', 'No additional tabletop'],
    ['Konfiguration geladen.', 'Configuration loaded.'],
    ['Geteilte Konfiguration geladen.', 'Shared configuration loaded.'],

    ['Lagun Tischgestell im Camper: mehr Freiraum zum Leben', 'Lagun table leg system in a camper: more room to live'],
    ['Lagun-Konfiguration als JSON-Datei auswählen', 'Select a Lagun configuration JSON file'],
    ['Farbe auswählen', 'Choose a finish'],
    ['Konfigurationsschritte', 'Configuration steps'],
    ['Montageort', 'Mounting position'],
    ['Tischbein', 'Table leg'],
    ['Tischarm', 'Lagun arm'],
    ['Die Bauteile unten zeigen zunächst Silber. Vergleiche beide Farben – deine übrige Auswahl bleibt erhalten.', 'The components below are initially shown in silver. Compare both finishes – the rest of your selection remains unchanged.'],
    ['Einbauart wählen', 'Choose a mounting type'],
    ['Befestigung auswählen', 'Select a mount'],
    ['Bein auswählen', 'Select a table leg'],
    ['Untertischplatte auswählen', 'Select an under-table mounting plate'],
    ['GAP hinter der Befestigungsplatte; das Bein sitzt auf der Schwalbenschwanzführung', 'GAP spacer behind the mounting plate; the table leg sits on the dovetail guide'],
    ['Lagun Erweiterungsarm mit Verbindungsbolzen', 'Lagun extension arm with connecting pin'],
    ['Einen weiteren Sitzplatz erreichen', 'Reach another seating position'],
    ['Die Armverlängerung ist kein Teleskopteil: Ein zweiter Schwenkarm wird mit einem Verbindungsbolzen am 400-mm-Basisarm befestigt. So entsteht ein zweiter Drehpunkt, mit dem du die Tischplatte zu weiteren Sitzpositionen führen kannst. Der tatsächliche Bewegungsradius hängt von Gelenkwinkeln, Möbeln und Tischplatte ab.', 'The arm extension is not a telescopic part: a second swivel arm is attached to the 400 mm base arm with a connecting pin. This creates a second pivot point that lets you move the tabletop to additional seating positions. The actual range of movement depends on the joint angles, furniture and tabletop.'],
    ['Wir empfehlen die 300-mm-Verlängerung. Beim zweiten 400-mm-Arm wird die Hebelwirkung erheblich größer und die Tragkraft sinkt deutlich. Verwende 400 mm deshalb nur, wenn du die zusätzliche Reichweite wirklich brauchst, und wähle immer eine kleine, leichte Tischplatte.', 'We recommend the 300 mm extension. A second 400 mm arm creates considerably more leverage and significantly reduces the load capacity. Use 400 mm only when you genuinely need the additional reach, and always choose a small, lightweight tabletop.'],
    ['An additional 300 mm arm reaches more positions. The connecting pin creates a second pivot point and is included in the bundle.', 'The arm extension is not a telescopic part: a second swivel arm is attached to the 400 mm base arm with a connecting pin. This creates a second pivot point that lets you move the tabletop to additional seating positions. The actual range of movement depends on the joint angles, furniture and tabletop.'],
    ['Useful when the standard arm does not reach your seat. The longer lever reduces the load capacity, so choose a smaller, lightweight tabletop.', 'We recommend the 300 mm extension. A second 400 mm arm creates considerably more leverage and significantly reduces the load capacity. Use 400 mm only when you genuinely need the additional reach, and always choose a small, lightweight tabletop.'],
    ['Welche Verlängerung brauchst du?', 'Which extension do you need?'],
    ['Tischarm und Armverlängerung', 'Table arm and arm extension'],
    ['Nur 400-mm-Basisarm', '400 mm base arm only'],
    ['Ein Schwenkarm für den normalen Sitzplatz – ohne zusätzliche Armverlängerung.', 'One swivel arm for the regular seating position, without an additional arm extension.'],
    ['400 mm · um 360° drehbar', '400 mm · rotates 360°'],
    ['Empfohlen', 'Recommended'],
    ['Zusätzlicher 300-mm-Arm', 'Additional 300 mm arm'],
    ['Mehr Bewegungsfreiheit bei moderaterer Hebelwirkung. Der farblich passende Verbindungsbolzen ist enthalten.', 'More freedom of movement with more moderate leverage. The colour-matched connecting pin is included.'],
    ['Zusätzlicher 400-mm-Arm', 'Additional 400 mm arm'],
    ['Nur bei notwendiger Reichweite', 'Only when the extra reach is necessary'],
    ['Erheblich größere Hebelwirkung und deutlich geringere Tragkraft. Nur mit einer kleinen, leichten Tischplatte verwenden.', 'Considerably greater leverage and significantly lower load capacity. Use only with a small, lightweight tabletop.'],
    ['Zweiter Schwenkarm · zweiter Drehpunkt', 'Second swivel arm · second pivot point'],
    ['Zweiter Schwenkarm · farblich passender Bolzen', 'Second swivel arm · colour-matched connecting pin'],
    ['Aufpreis', 'Additional price'],
    ['300 mm · empfohlen', '300 mm · recommended'],
    ['Mehr Bewegungsfreiheit bei moderaterer Hebelwirkung.', 'More freedom of movement with more moderate leverage.'],
    ['400 mm · nur bei notwendiger Reichweite', '400 mm · only when the extra reach is necessary'],
    ['Die Hebelwirkung wird erheblich größer. Verwende diese Länge nur, wenn du die zusätzliche Reichweite wirklich brauchst, und wähle eine kleine, leichte Tischplatte.', 'The leverage becomes considerably greater. Use this length only when you genuinely need the additional reach, and choose a small, lightweight tabletop.'],
    ['400-mm-Erweiterungsarm', '400 mm extension arm'],
    ['Verbindungsbolzen zur 400-mm-Verlängerung', 'Connecting pin for the 400 mm extension'],
    ['400-mm-Arm + 300-mm-Verlängerung', '400 mm arm + 300 mm extension'],
    ['400-mm-Arm + 400-mm-Verlängerung', '400 mm arm + 400 mm extension'],
    ['Lagun Tischbein: Für das Kürzen nur das Metall ohne den schwarzen Kunststoffbolzen messen', 'Lagun table leg: for shortening, measure only the metal without the black plastic pin'],
    ['Deine Lagun-Konfiguration', 'Your Lagun configuration'],
    ['Dein Lagun mit einem Schwenkarm und Standard-Unterplatte', 'Your Lagun with one swivel arm and standard under-table mounting plate'],
    ['Bauteil im Gestell auswählen', 'Select a component in the system'],
    ['Mount auswählen', 'Select a mount'],
    ['Table leg auswählen', 'Select a table leg'],
    ['Arm auswählen', 'Select a Lagun arm'],
    ['Under-table mounting plate auswählen', 'Select an under-table mounting plate'],
    ['Zweiten Arm auswählen', 'Select a second arm'],
    ['Farbe jederzeit wechseln', 'Change the finish at any time'],
    ['Dein Gestell wächst mit deiner Auswahl', 'Your table leg system grows with your selection'],
    ['Noch offen:', 'Still to choose:'],
    ['Noch offen: Befestigung, Bein, Arm, Untertischplatte.', 'Still to choose: mount, table leg, Lagun arm and under-table mounting plate.'],

    ['Zu den ausführlichen Bewertungen springen', 'Skip to the detailed reviews'],
    ['Auf Lager', 'In stock'],
    ['Art.-Nr.', 'SKU'],
    ['Produktvorteile', 'Product benefits'],
    ['Service und Vorteile beim Bestellen', 'Service and benefits when ordering'],
    ['Verfügbare Zahlungsarten', 'Available payment methods'],
    ['BESCHREIBUNG', 'DESCRIPTION'],
    ['Beschreibung', 'Description'],
    ['EIGENSCHAFTEN', 'FEATURES'],
    ['Eigenschaften', 'Features'],
    ['HINWEISE', 'NOTES'],
    ['Hinweise', 'Notes'],
    ['LIEFERUMFANG', 'WHAT IS INCLUDED'],
    ['Lieferumfang', 'What is included'],
    ['HERSTELLERINFORMATIONEN', 'MANUFACTURER INFORMATION'],
    ['Herstellerinformationen', 'Manufacturer information'],
    ['Lagun Tischgestell im flexiblen Camper-Ausbau', 'Lagun table leg system in a flexible camper conversion'],
    ['Lagun Tischgestell mit markierten Bauteilen', 'Lagun table leg system with labelled components'],
    ['Details der 360-Grad-Ansicht', '360-degree view details'],
    ['4,9 von 5 Sternen', '4.9 out of 5 stars'],
    ['Kundenbewertungen', 'customer reviews'],
    ['Bewertungen ansehen', 'View reviews'],
    ['SERVICE/HILFE', 'SERVICE/HELP'],
    ['Service/Hilfe', 'Service/help'],
    ['KONTAKT UND BERATUNG', 'CONTACT AND ADVICE'],
    ['Kontakt und Beratung', 'Contact and advice'],
    ['Oder schreib uns:', 'Or write to us:'],
    ['oder Whatsapp!', 'or WhatsApp!'],
    ['🏕️ Leidenschaft für Camping: Wir leben und lieben Camping! Unser Team aus Pionieren ist ständig auf der Suche nach innovativen Camping-Produkten für dein perfektes Abenteuer.', '🏕️ Passion for camping: We live and love camping! Our team of pioneers is always looking for innovative camping products for your perfect adventure.'],
    ['Leidenschaft für Camping: Wir leben und lieben Camping! Unser Team aus Pionieren ist ständig auf der Suche nach innovativen Camping-Produkten für dein perfektes Abenteuer.', 'Passion for camping: We live and love camping! Our team of pioneers is always looking for innovative camping products for your perfect adventure.'],
    ['Leidenschaft für Camping', 'Passion for camping'],
    [': Wir leben und lieben Camping! Unser Team aus Pionieren ist ständig auf der Suche nach innovativen Camping-Produkten für dein perfektes Abenteuer.', ': We live and love camping! Our team of pioneers is always looking for innovative camping products for your perfect adventure.'],
    ['📍 Regional Verbunden: Mit Herz in Thüringen und Bayern, setzen wir auf enge Zusammenarbeit mit lokalen Herstellern. Unser Fokus: Qualitätsprodukte aus Europa.', '📍 Strong regional roots: Based in Thuringia and Bavaria, we work closely with local manufacturers. Our focus: quality products from Europe.'],
    ['Regional Verbunden: Mit Herz in Thüringen und Bayern, setzen wir auf enge Zusammenarbeit mit lokalen Herstellern. Unser Fokus: Qualitätsprodukte aus Europa.', 'Strong regional roots: Based in Thuringia and Bavaria, we work closely with local manufacturers. Our focus: quality products from Europe.'],
    ['Regional Verbunden', 'Strong regional roots'],
    [': Mit Herz in Thüringen und Bayern, setzen wir auf enge Zusammenarbeit mit lokalen Herstellern. Unser Fokus: Qualitätsprodukte aus Europa.', ': Based in Thuringia and Bavaria, we work closely with local manufacturers. Our focus: quality products from Europe.'],
    ['🤝 Qualität & Expertise: Wir unterstützen regionale Betriebe und pflegen intensiven Kontakt zur Camping-Branche. Unser Ziel: Dir schnell und zuverlässig spannende Produkte mit hohen Standards zu bieten.', '🤝 Quality and expertise: We support regional businesses and maintain close ties with the camping industry. Our goal is to offer you exciting products with high standards quickly and reliably.'],
    ['Qualität & Expertise: Wir unterstützen regionale Betriebe und pflegen intensiven Kontakt zur Camping-Branche. Unser Ziel: Dir schnell und zuverlässig spannende Produkte mit hohen Standards zu bieten.', 'Quality and expertise: We support regional businesses and maintain close ties with the camping industry. Our goal is to offer you exciting products with high standards quickly and reliably.'],
    ['Qualität & Expertise', 'Quality and expertise'],
    [': Wir unterstützen regionale Betriebe und pflegen intensiven Kontakt zur Camping-Branche. Unser Ziel: Dir schnell und zuverlässig spannende Produkte mit hohen Standards zu bieten.', ': We support regional businesses and maintain close ties with the camping industry. Our goal is to offer you exciting products with high standards quickly and reliably.'],
    ['Melde dich hier für unseren Newsletter an', 'Sign up for our newsletter here'],

    ['Zusammenfassung der Produktauswahl', 'Product selection summary'],
    ['Produktbewertungen', 'Product reviews'],
    ['Details des silbernen Lagun Tischgestells aus Aluminium', 'Details of the silver aluminium Lagun table leg system'],
    ['Lagun Tischgestell im Camping-Ausbau', 'Lagun table leg system in a camper conversion'],
    ['Montiertes Lagun Tischgestell im Camper', 'Installed Lagun table leg system in a camper'],
    ['ansehen', 'view']
  ];

  const exact = new Map(pairs);
  const partialPairs = [
    ['Mehr zu:', 'More about:'],
    ['Noch offen:', 'Still to choose:'],
    ['4,9 out of', '4.9 out of'],
    ['Bewertungen', 'reviews'],
    ['Silber als Ansicht', 'silver preview'],
    ['Silber', 'Silver'],
    [' · Silber', ' · Silver'],
    ['GAP hinter der Befestigungsplatte', 'GAP spacer behind the mounting plate'],
    ['Montage der Befestigungsplatte', 'mounting the mounting plate'],
    ['Tischbein sitzt', 'table leg sits'],
    ['Tischbein:', 'Table leg:'],
    ['Verbindungsbolzen', 'connecting pin'],
    [' auswählen', ' select']
  ];

  function translate(value) {
    if (typeof value !== 'string' || !value.trim()) return value;
    const leading = value.match(/^\s*/)?.[0] || '';
    const trailing = value.match(/\s*$/)?.[0] || '';
    const trimmed = value.trim();
    if (exact.has(trimmed)) return leading + exact.get(trimmed) + trailing;
    if (/^Ab\s+/.test(trimmed)) return leading + trimmed.replace(/^Ab\s+/, 'From ') + trailing;
    let output = value;
    for (const [source, target] of partialPairs) {
      if (!output.includes(source)) continue;
      output = output.split(source).join(target);
    }
    return output;
  }

  function translateElement(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      const next = translate(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    const elements = root.matches('*') ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
    for (const element of elements) {
      for (const attribute of ['alt', 'aria-label', 'placeholder', 'title', 'data-adding-text', 'data-success-text', 'data-error-text']) {
        if (!element.hasAttribute(attribute)) continue;
        const current = element.getAttribute(attribute);
        const next = translate(current);
        if (next !== current) element.setAttribute(attribute, next);
      }
      if (element.matches('a[href^="/"]')) {
        const href = element.getAttribute('href');
        if (/^\/(?:pages|products|collections|search)(?:\/|$)/.test(href)) element.setAttribute('href', `/en${href}`);
      }
    }
  }

  const scopeSelector = 'body';
  const inScope = (node) => {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.matches?.(scopeSelector) || element?.closest?.(scopeSelector));
  };

  window.CpEnglishRuntime = {translate, translateElement};
  document.querySelectorAll(scopeSelector).forEach(translateElement);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        if (inScope(mutation.target)) translateElement(mutation.target);
        continue;
      }
      if (mutation.type === 'characterData') {
        if (!inScope(mutation.target)) continue;
        const next = translate(mutation.target.nodeValue);
        if (next !== mutation.target.nodeValue) mutation.target.nodeValue = next;
      }
      for (const node of mutation.addedNodes) {
        if (!inScope(node) && !(node.nodeType === Node.ELEMENT_NODE && node.querySelector?.(scopeSelector))) continue;
        if (node.nodeType === Node.TEXT_NODE) {
          const next = translate(node.nodeValue);
          if (next !== node.nodeValue) node.nodeValue = next;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          translateElement(node);
        }
      }
    }
  });
  observer.observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['alt', 'aria-label', 'placeholder', 'title', 'data-adding-text', 'data-success-text', 'data-error-text', 'href']});
})();
