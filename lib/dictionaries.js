// Wörterbücher für Standardkategorien (Auto-Validierung & Tippfehler-Korrektur)
// Bewusst pragmatisch gehalten: häufige Antworten pro Anfangsbuchstabe.

const STADT = [
  'Aachen','Augsburg','Amsterdam','Athen','Ankara','Antwerpen','Alexandria','Algier','Aalborg','Ankara','Arnheim',
  'Berlin','Bremen','Bonn','Bochum','Bielefeld','Braunschweig','Brüssel','Budapest','Barcelona','Bern','Belgrad','Bagdad','Bangkok','Boston','Buenos Aires','Basel','Bremerhaven','Bottrop',
  'Chemnitz','Cottbus','Chicago','Köln','Kairo','Cancún','Casablanca','Cape Town',
  'Dresden','Duisburg','Dortmund','Düsseldorf','Darmstadt','Dakar','Delhi','Dublin','Dakar','Damaskus','Dubai',
  'Essen','Erfurt','Erlangen','Edinburgh','Eindhoven','Eisenach','Esslingen',
  'Frankfurt','Freiburg','Florenz','Fukuoka','Florenz','Fürth',
  'Göttingen','Gelsenkirchen','Genf','Glasgow','Gera','Görlitz','Genua','Gdansk','Granada',
  'Hamburg','Hannover','Heidelberg','Halle','Hamm','Hagen','Helsinki','Hongkong','Havanna','Houston','Heilbronn','Hildesheim',
  'Ingolstadt','Innsbruck','Istanbul','Indianapolis',
  'Jena','Jakarta','Jerusalem','Johannesburg',
  'Köln','Kiel','Karlsruhe','Kassel','Kairo','Kopenhagen','Kapstadt','Krakau','Kiew','Krefeld','Koblenz','Kuala Lumpur','Kabul',
  'Leipzig','Lübeck','Ludwigshafen','Leverkusen','London','Lissabon','Lyon','Liverpool','Linz','Luxemburg','Las Vegas','Los Angeles','Lima','Lagos',
  'München','Mainz','Mannheim','Magdeburg','Münster','Moskau','Madrid','Mailand','Marseille','Manchester','Manila','Melbourne','Mexiko-Stadt','Mumbai','Miami','Montreal',
  'Nürnberg','Neuss','Neapel','Nizza','New York','Nantes','Nairobi','New Delhi',
  'Oldenburg','Osnabrück','Offenbach','Oslo','Odessa','Ottawa','Oakland',
  'Potsdam','Paderborn','Pforzheim','Paris','Prag','Porto','Peking','Philadelphia','Phoenix','Perth',
  'Quito','Quebec',
  'Regensburg','Recklinghausen','Reutlingen','Remscheid','Rostock','Rom','Riga','Reykjavik','Riad','Rio de Janeiro',
  'Stuttgart','Saarbrücken','Salzgitter','Solingen','Siegen','Schwerin','Sydney','Singapur','Stockholm','São Paulo','San Francisco','Seattle','Seoul','Schanghai','Sankt Petersburg',
  'Trier','Tübingen','Tokio','Toronto','Tel Aviv','Teheran','Toulouse','Turin','Taipeh',
  'Ulm','Utrecht','Uppsala',
  'Vechta','Venedig','Vancouver','Valencia','Verona','Vilnius','Wien',
  'Würzburg','Wuppertal','Wiesbaden','Wolfsburg','Warschau','Washington','Wien','Weimar','Wladiwostok'
];

const LAND = [
  'Afghanistan','Ägypten','Albanien','Algerien','Andorra','Angola','Argentinien','Armenien','Aserbaidschan','Australien','Äthiopien',
  'Bahamas','Bahrain','Bangladesch','Belarus','Belgien','Belize','Benin','Bolivien','Bosnien','Botswana','Brasilien','Bulgarien','Burkina Faso','Burundi',
  'Chile','China','Costa Rica','Côte d’Ivoire',
  'Dänemark','Deutschland','Dominica','Dominikanische Republik','Dschibuti',
  'Ecuador','El Salvador','Eritrea','Estland','Eswatini',
  'Fidschi','Finnland','Frankreich',
  'Gabun','Gambia','Georgien','Ghana','Grenada','Griechenland','Guatemala','Guinea','Guyana',
  'Haiti','Honduras',
  'Indien','Indonesien','Irak','Iran','Irland','Island','Israel','Italien',
  'Jamaika','Japan','Jemen','Jordanien',
  'Kambodscha','Kamerun','Kanada','Kap Verde','Kasachstan','Katar','Kenia','Kirgisistan','Kiribati','Kolumbien','Komoren','Kongo','Kosovo','Kroatien','Kuba','Kuwait',
  'Laos','Lesotho','Lettland','Libanon','Liberia','Libyen','Liechtenstein','Litauen','Luxemburg',
  'Madagaskar','Malawi','Malaysia','Malediven','Mali','Malta','Marokko','Marshallinseln','Mauretanien','Mauritius','Mexiko','Mikronesien','Moldau','Monaco','Mongolei','Montenegro','Mosambik','Myanmar',
  'Namibia','Nauru','Nepal','Neuseeland','Nicaragua','Niederlande','Niger','Nigeria','Nordkorea','Nordmazedonien','Norwegen',
  'Oman','Österreich',
  'Pakistan','Palau','Panama','Papua-Neuguinea','Paraguay','Peru','Philippinen','Polen','Portugal',
  'Ruanda','Rumänien','Russland',
  'Salomonen','Sambia','Samoa','San Marino','São Tomé','Saudi-Arabien','Schweden','Schweiz','Senegal','Serbien','Seychellen','Sierra Leone','Simbabwe','Singapur','Slowakei','Slowenien','Somalia','Spanien','Sri Lanka','St. Lucia','Südafrika','Sudan','Südkorea','Südsudan','Suriname','Syrien',
  'Tadschikistan','Taiwan','Tansania','Thailand','Timor-Leste','Togo','Tonga','Trinidad und Tobago','Tschad','Tschechien','Tunesien','Türkei','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','Ungarn','Uruguay','USA','Usbekistan',
  'Vanuatu','Vatikanstadt','Venezuela','Vereinigte Arabische Emirate','Vereinigtes Königreich','Vietnam',
  'Weißrussland',
  'Zentralafrikanische Republik','Zypern'
];

const FLUSS = [
  'Aller','Amazonas','Amper','Aare','Adda','Adige','Amur','Angara','Argen','Avon',
  'Brahmaputra','Bode','Brenta','Brigach',
  'Colorado','Columbia','Congo',
  'Donau','Dnepr','Don','Drau','Düssel','Danube',
  'Eder','Ebro','Elbe','Ems','Eider','Euphrat',
  'Fulda','Fyris',
  'Ganges','Garonne','Gard','Glan','Gera','Glomma',
  'Havel','Hudson','Huang He',
  'Iller','Inn','Indus','Irrawaddy','Isar','Isère','IJssel',
  'Jangtsekiang','Jordan','Jenissei',
  'Kongo','Kasai','Kura','Klang',
  'Lahn','Lech','Leine','Limmat','Lippe','Loire','Lena','Limpopo',
  'Main','Mosel','Mulde','Mississippi','Missouri','Mekong','Memel','Murray','Murg','Mur',
  'Neckar','Niger','Nil','Naab','Nahe','Niers','Neman',
  'Oder','Ohio','Orinoco','Ouse','Oka','Orange',
  'Po','Paraná','Parana','Pegnitz','Pleiße','Plön',
  'Rhein','Ruhr','Rhone','Rhône','Roer','Rio Grande',
  'Saale','Saar','Sieg','Spree','Seine','Save','Sambesi','Sankt-Lorenz-Strom','Schelde',
  'Tauber','Themse','Theiß','Tigris','Tiber','Trave',
  'Ucayali','Ural','Uruguay','Usk',
  'Volga','Vltava','Volta','Vechte',
  'Weser','Werra','Wisla','Wupper','Weichsel','Wümme'
];

const NAME = [
  'Alex','Alexander','Anna','Anton','Andreas','Anke','Antonia','Annika','Achim','Andrea',
  'Ben','Bernd','Boris','Bruno','Bianca','Birgit','Bettina','Bastian','Benjamin','Beate',
  'Carla','Carl','Carlo','Carmen','Caroline','Christian','Christine','Cora','Claudia','Clemens',
  'Daniel','Daniela','David','Dennis','Diana','Dieter','Dirk','Dominik','Doris','Detlef',
  'Elena','Elias','Emil','Emma','Erik','Eva','Edgar','Edith','Eberhard','Elisabeth',
  'Felix','Fiona','Florian','Frank','Franz','Frida','Friedrich','Fabian','Frauke','Ferdinand',
  'Gabi','Georg','Gerd','Greta','Gustav','Günter','Gerda','Gabriele','Gernot','Gisela',
  'Hannah','Hans','Hanna','Heinrich','Helena','Helmut','Henri','Holger','Heike','Herbert','Hilde',
  'Ida','Ina','Inge','Ingo','Iris','Isabel','Ivo','Ilona','Ingrid','Ismael',
  'Jacob','Jan','Jana','Jens','Jonas','Julia','Julian','Jasmin','Jennifer','Joachim','Jörg','Jürgen',
  'Karl','Karla','Karsten','Katharina','Klaus','Konrad','Katrin','Karina','Kerstin','Kevin','Kirsten',
  'Lara','Laura','Lea','Leon','Linda','Lisa','Louisa','Lukas','Lena','Liam','Lothar','Ludwig',
  'Maja','Manuel','Marc','Marcel','Maria','Marie','Marina','Mario','Mark','Markus','Martin','Matthias','Max','Maximilian','Melanie','Michael','Mira','Moritz',
  'Nadja','Nico','Niklas','Nina','Noah','Nora','Norbert','Nadine','Nicolas',
  'Oliver','Olivia','Otto','Olaf','Oskar',
  'Patrick','Paul','Paula','Peter','Petra','Philipp','Pia','Pascal','Pauline',
  'Quentin','Quirin',
  'Rafael','Ralph','Rebecca','Robert','Robin','Roman','Rolf','Rudolf','Renate','Ruth','Reinhard',
  'Sabine','Samuel','Sandra','Sarah','Sebastian','Selina','Silas','Simon','Sina','Sonja','Sophia','Sophie','Stefan','Stella','Susanne','Sven',
  'Tamara','Theo','Thomas','Tim','Tobias','Tom','Tanja','Tina','Tilo','Torsten','Toni',
  'Ulla','Ulrich','Uwe','Ursula','Urs',
  'Valentin','Vanessa','Vera','Victor','Vincent','Volker','Veronika','Vivien',
  'Walter','Werner','Wilhelm','Wolfgang','Wanda','Wiebke'
];

const TIER = [
  'Adler','Affe','Alpaka','Ameise','Antilope','Albatros','Auerhahn','Axolotl',
  'Bär','Biber','Biene','Bison','Buntspecht','Büffel','Brachvogel','Buchfink','Basilisk','Blauwal',
  'Chamäleon','Chinchilla','Chihuahua','Cobra',
  'Dachs','Delfin','Dromedar','Dackel','Dingo','Drossel','Dorsch',
  'Eichhörnchen','Eisbär','Elch','Elefant','Ente','Esel','Eule','Emu','Erdmännchen','Eidechse','Eisvogel',
  'Falke','Fasan','Fisch','Flamingo','Fledermaus','Fliege','Forelle','Fuchs','Frettchen','Frosch','Feldhamster',
  'Gans','Gazelle','Gepard','Giraffe','Gnu','Goldfisch','Gorilla','Grille','Gürteltier','Grottenolm',
  'Hahn','Hai','Hamster','Hase','Hecht','Hering','Hirsch','Hummel','Hund','Hyäne','Habicht','Hummer',
  'Igel','Iltis','Ibis','Iguana',
  'Jaguar','Jakobsmuschel','Junikäfer',
  'Kakadu','Kamel','Kaninchen','Karpfen','Katze','Känguru','Kiwi','Koala','Krähe','Krebs','Krokodil','Kröte','Kuh','Klippschliefer','Kondor','Komodowaran',
  'Lachs','Lama','Leopard','Libelle','Löwe','Luchs','Laubfrosch','Lemming','Leguan',
  'Marder','Marienkäfer','Maulwurf','Maus','Meerschweinchen','Möwe','Murmeltier','Manati','Makrele','Mungo','Mantarochen',
  'Nashorn','Natter','Nilpferd','Nasenbär','Narwal','Nachtigall',
  'Ochse','Okapi','Orang-Utan','Otter','Oktopus','Opossum','Ohrwurm',
  'Panda','Panther','Papagei','Pavian','Pelikan','Pferd','Pinguin','Pony','Puma','Pute',
  'Quappe','Qualle','Quokka',
  'Rabe','Reh','Robbe','Ratte','Rotkehlchen','Rentier','Rochen','Raupe',
  'Schaf','Schildkröte','Schimpanse','Schmetterling','Schnecke','Schwalbe','Schwan','Schwein','Seehund','Spatz','Specht','Spinne','Star','Stier','Storch','Strauß','Salamander','Stachelschwein',
  'Taube','Tiger','Tintenfisch','Truthahn','Termit','Tukan','Tapir',
  'Uhu','Unke','Ural-Eule',
  'Vampirfledermaus','Vielfraß','Vipernatter',
  'Wal','Walross','Waran','Wasserschwein','Wespe','Wiesel','Wildschwein','Wolf','Wombat','Waschbär','Wachtel'
];

const BERUF = [
  'Anwalt','Apotheker','Architekt','Arzt','Astronaut','Astronom','Auktionator','Animateur','Anlagenmechaniker',
  'Bäcker','Bankkaufmann','Bauarbeiter','Bauer','Beamter','Berater','Bergmann','Betreuer','Bibliothekar','Biologe','Buchhalter','Busfahrer','Bäckerin',
  'Chef','Chemiker','Chirurg','Choreograph','Comedian','Controller','Coach',
  'Dachdecker','Designer','Detektiv','Dolmetscher','Drucker','Diplomat','Drogist','Dirigent',
  'Elektriker','Erzieher','Eisverkäufer','Elektroniker','Ergotherapeut',
  'Fahrer','Filmemacher','Fischer','Fliesenleger','Florist','Forscher','Fotograf','Friseur','Feuerwehrmann','Förster','Finanzberater',
  'Gärtner','Geograph','Geologe','Geschäftsführer','Gitarrist','Glaser','Goldschmied','Grafiker','Gerichtsvollzieher','Gerichtsmediziner',
  'Händler','Handwerker','Hausfrau','Hausmeister','Hebamme','Heilpraktiker','Hotelier','Hundetrainer','Hutmacher','Heizungsmonteur','Hafenarbeiter',
  'Illustrator','Imker','Informatiker','Ingenieur','Installateur','Innenarchitekt','Industriekaufmann',
  'Jäger','Journalist','Jurist','Juwelier','Jugendwart',
  'Kameramann','Kaufmann','Kellner','Klempner','Koch','Krankenpfleger','Krankenschwester','Künstler','Kapitän','Konditor','Kindergärtner','Kommissar','Komponist',
  'Landwirt','Lehrer','Lokführer','Logopäde','Lagerist','Lektor',
  'Maler','Manager','Maniküre','Masseur','Maurer','Mechaniker','Mediziner','Meteorologe','Metzger','Modedesigner','Müller','Musiker','Mathematiker','Modell','Moderator',
  'Notar','Notarzt','Nachrichtensprecher','Näher','Netzwerktechniker',
  'Optiker','Operateur','Ortsvorsteher','Organist',
  'Pastor','Pfarrer','Pflegekraft','Pilot','Polizist','Politiker','Postbote','Professor','Programmierer','Psychologe','Putzfrau','Physiker','Physiotherapeut','Pförtner',
  'Quizmaster',
  'Reporter','Richter','Rechtsanwalt','Reisebegleiter','Rentner','Reiseleiter','Rezeptionist','Roboteriker','Rollstuhlfahrer',
  'Sänger','Schauspieler','Schiffsbauer','Schlosser','Schmied','Schneider','Schornsteinfeger','Schreiner','Schriftsteller','Schuster','Sekretär','Soldat','Sozialarbeiter','Sportler','Stewardess','Steuerberater','Statiker',
  'Tänzer','Taxifahrer','Techniker','Therapeut','Tierarzt','Tischler','Trainer','Töpfer','Tontechniker','Tankwart',
  'Übersetzer','Uhrmacher','Unternehmer',
  'Verkäufer','Verwalter','Verleger','Verleger','Volkswirt','Vermesser',
  'Wissenschaftler','Winzer','Wachmann','Werbetexter','Webentwickler','Wirt'
];

const ALIASES = {
  stadt: STADT, stadte: STADT, staedte: STADT, städte: STADT, ort: STADT, orte: STADT,
  land: LAND, lander: LAND, länder: LAND, laender: LAND, staat: LAND, staaten: LAND,
  fluss: FLUSS, flüsse: FLUSS, fluesse: FLUSS, flusse: FLUSS, gewässer: FLUSS, gewasser: FLUSS,
  name: NAME, namen: NAME, vorname: NAME, vornamen: NAME, mannername: NAME, frauenname: NAME,
  tier: TIER, tiere: TIER,
  beruf: BERUF, berufe: BERUF
};

function normalizeCategoryKey(category) {
  return (category || '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .trim();
}

function getDictionary(category) {
  const key = normalizeCategoryKey(category);
  if (ALIASES[key]) return ALIASES[key];
  // weicher Fallback: prüfen, ob ein Schlüssel als Substring vorkommt
  for (const alias of Object.keys(ALIASES)) {
    if (key === alias || key.startsWith(alias)) return ALIASES[alias];
  }
  return null;
}

module.exports = { getDictionary };
