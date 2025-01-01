//Dernière modification : mer. 01 janv. 2025,  07:06
const COF2_BETA = true;
let COF2_loaded = false;

var COFantasy2 = COFantasy2 || function() {

  "use strict";

  const scriptVersion = '1.00';
  const HISTORY_SIZE = 200;
  //const versionFiche = 1.1.0;
  const PIX_PER_UNIT = 70;
  //const BS_LABEL = 'text-transform: uppercase; display: inline; padding: .2em .6em .3em; font-size: 75%; line-height: 2; color: #fff; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: .25em;';
  //const BS_LABEL_SUCCESS = 'background-color: #5cb85c;';
  //const BS_LABEL_INFO = 'background-color: #5bc0de;';
  //const BS_LABEL_WARNING = 'background-color: #f0ad4e;';
  //const BS_LABEL_DANGER = 'background-color: #d9534f;';
  const DEFAULT_DYNAMIC_INIT_IMG = 'https://s3.amazonaws.com/files.d20.io/images/4095816/086YSl3v0Kz3SlDAu245Vg/thumb.png?1400535580';
  const flashyInitMarkerScale = 1.6;
  //const IMG_INVISIBLE = 'https://s3.amazonaws.com/files.d20.io/images/24377109/6L7tn91HZLAQfrLKQI7-Ew/thumb.png?1476950708';
  //const IMG_BOMB = 'https://s3.amazonaws.com/files.d20.io/images/361033841/dmwnChkZNCI9a0_uKfGcNg/thumb.png?1695976505';


  // Génération de unique ID pour les repeating fields

  let previousUUIDTime = 0;
  let UUIDSeed = [];

  function generateRowID() {
    let c = (new Date()).getTime() + 0;
    let same_date = c === previousUUIDTime;
    previousUUIDTime = c;
    let e = new Array(8);
    for (let f = 7; 0 <= f; f--) {
      e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
      c = Math.floor(c / 64);
    }
    c = e.join("");
    if (same_date) {
      let f = 11;
      for (; 0 <= f && 63 === UUIDSeed[f]; f--) {
        UUIDSeed[f] = 0;
      }
      UUIDSeed[f]++;
    } else {
      for (let f = 0; f < 12; f++) {
        UUIDSeed[f] = Math.floor(64 * Math.random());
      }
    }
    for (let f = 0; f < 12; f++) {
      c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(UUIDSeed[f]);
    }
    return c.replace(/_/g, "Z");
  }

  function error(msg, obj) {
    log(msg);
    log(obj);
    if (msg) {
      try {
        sendChat('COFantasy2', msg);
      } catch (e) {
        msg = msg.replace('[', '[ ');
        sendChat('COFantasy2', "Message sans jet : " + msg);
      }
    }
  }

  //Les variables globales
  let markerCatalog = {};
  let updateNextInitSet = new Set();
  let alliesParPerso = {};
  let alliesDAttaqueEnMeute = new Set();
  let equipes = {};
  let listeCompetences = {
    AGI: {
      list: [],
      elts: new Set()
    },
    CON: {
      list: [],
      elts: new Set()
    },
    FOR: {
      list: [],
      elts: new Set()
    },
    PER: {
      list: [],
      elts: new Set()
    },
    CHA: {
      list: [],
      elts: new Set()
    },
    INT: {
      list: [],
      elts: new Set()
    },
    VOL: {
      list: [],
      elts: new Set()
    },
    nombre: 0
  };

  const cof_states = {
    affaibli: 'status_half-heart',
    apeure: 'status_screaming',
    assomme: 'status_pummeled',
    aveugle: 'status_bleeding-eye',
    blesse: 'status_arrowed',
    chef: 'status_black-flag',
    encombre: 'status_frozen-orb',
    endormi: 'status_sleepy',
    essoufle: 'status_half_haze',
    etourdi: 'status_half-haze',
    invalide: 'status_tread',
    invisible: 'status_ninja-mask',
    immobilise: 'status_cobweb',
    mort: 'status_dead',
    paralyse: 'status_fishing-net',
    penombre: 'status_archery-target',
    ralenti: 'status_snail',
    renverse: 'status_back-pain',
    surpris: 'status_lightning-helix',
  };

  //Remplis quand on sait quels sont les markers dans setStateCOF
  const etat_de_marker = {};
  const effet_de_marker = {};

  const defaultOptions = {
    regles: {
      explications: "Options qui influent sur les règles du jeu",
      type: 'options',
      val: {}
    },
    affichage: {
      explications: "Options d'affichage",
      type: 'options',
      val: {
        MJ_voit_actions: {
          explications: "À chaque nouveau personnage en combat, montre le choix d'actions au MJ, même pour les PJs.",
          val: false,
          type: 'bool'
        },
        MJ_valide_affichage_attaques: {
          explications: "Les résultats des attaques sont d'abord montrées au MJ seul, qui peut ensuite les montrer aux joueurs",
          val: false,
          type: 'bool'
        },
        MJ_valide_affichage_jets: {
          explications: "Les résultats des jets de caractéristiques sont d'abord montrées au MJ seul, qui peut ensuite les montrer aux joueurs",
          val: false,
          type: 'bool'
        },
        avatar_dans_cadres: {
          explications: "Si faux, on utilise l'image du token.",
          val: true,
          type: 'bool'
        },
        manoeuvres: {
          explications: "Affiche les manoeuvres dans la liste d'actions",
          val: true,
          type: 'bool'
        },
        montre_def: {
          explications: "montre la DEF des adversaires dans les cadres de combat",
          val: true,
          type: 'bool'
        },
        duree_effets: {
          explications: "Le script indique la durée des effets associés aux tokens",
          val: false,
          type: 'bool'
        },
        init_dynamique: {
          explications: "Fait apparaître une aura dynamique sur le token qui a l'initiative",
          val: true,
          type: 'bool'
        },
        markers_personnalises: {
          explications: "Utilisation des markers personnalisés commençant par cof",
          val: true,
          type: 'bool'
        },
        depense_mana: {
          explications: "Le script précise la quantité de mana utilisée dans le chat à chaque fois",
          val: false,
          type: 'bool'
        }
      }
    },
    images: {
      explications: "Images par défaut",
      type: 'options',
      val: {
        image_init: {
          explications: "Image utilisée pour indiquer le personnage dont c'est le tour",
          type: 'image',
          val: DEFAULT_DYNAMIC_INIT_IMG
        },
      }
    },
    sons: {
      explications: "Sons par défaut",
      type: 'options',
      val: {
        attaque_echec_critique: {
          explication: "Son utilisé pour les échecs critiques d'attaques",
          type: 'son',
          val: ''
        },
        attaque_reussite_critique: {
          explication: "Son utilisé pour les réussites critiques d'attaques",
          type: 'son',
          val: ''
        }
      }
    },
    macros_a_jour: {
      explications: "Met automatiquement les macros à jour",
      type: 'bool',
      val: true
    }
  };

  function copyOptions(dst, src) {
    for (let o in src) {
      let opt = src[o];
      let isOption = opt.type == 'options';
      if (dst[o] === undefined) {
        dst[o] = {
          explications: opt.explications,
          val: {},
          type: opt.type,
        };
        if (!isOption) dst[o].val = opt.val;
      } else {
        if (dst[o].explications != opt.explications)
          dst[o].explications = opt.explications;
        if (dst[o].type != opt.type)
          dst[o].type = opt.type;
      }
      if (isOption) copyOptions(dst[o].val, opt.val);
    }
  }

  const PAUSE = String.fromCharCode(0x23F8);
  const PLAY = String.fromCharCode(0x23F5);
  const MONTER = String.fromCharCode(0x2197);
  const DESCENDRE = String.fromCharCode(0x2198);

  //Crée les macros utiles au jeu
  const gameMacros = [
    /*{
        name: 'Actions',
        action: "!cof-liste-actions",
        visibleto: 'all',
        istokenaction: true
      }, {
        name: 'Attaque',
        action: "!cof-attack @{selected|token_id} @{target|token_id}",
        visibleto: 'all',
        istokenaction: false
      }, {
        name: 'Consommables',
        action: "!cof-consommables",
        visibleto: 'all',
        istokenaction: true
      }, {
        name: 'Bouger',
        action: "!cof-bouger",
        visibleto: '',
        istokenaction: false,
        inBar: true
      },*/ {
        name: MONTER,
        oldName: 'Monter',
        action: "!cof2-escalier haut",
        visibleto: 'all',
        istokenaction: true,
        inBar: false
      }, {
        name: DESCENDRE,
        oldName: 'Descendre',
        action: "!cof2-escalier bas",
        visibleto: 'all',
        istokenaction: true,
        inBar: false
      }, /*{
        name: 'Fin-combat',
        action: "!cof-fin-combat",
        visibleto: '',
        istokenaction: false,
        inBar: true
      }, {
        name: 'Init',
        action: "!cof-init",
        visibleto: '',
        istokenaction: false,
        inBar: true
      }, {
        name: 'Jets',
        action: "!cof-jet",
        visibleto: 'all',
        istokenaction: true,
      }, {
        name: 'Jets-GM',
        action: "!cof-jet --secret",
        visibleto: '',
        istokenaction: false,
        inBar: true
      }, {
        name: 'Nuit',
        action: "!cof-nouveau-jour ?{Repos?|Oui,--repos|Non}",
        visibleto: '',
        istokenaction: false,
        inBar: true
      }, {
        name: 'Repos',
        action: "!cof-recuperation",
        visibleto: 'all',
        istokenaction: true,
        inBar: false
      }, {
        name: 'Statut',
        action: "!cof-statut",
        visibleto: 'all',
        istokenaction: true
      }, {
        name: 'Surprise',
        action: "!cof-surprise ?{difficulté}",
        visibleto: '',
        istokenaction: false,
        inBar: true
      }, {
        name: 'Torche',
        action: "!cof-torche @{selected|token_id}",
        visibleto: 'all',
        istokenaction: true,
      }, {
        name: 'Éteindre',
        action: "!cof-eteindre-lumiere ?{Quelle lumière?|Tout}",
        visibleto: '',
        istokenaction: false,
        inBar: true
      }, {
        name: 'devient',
        action: "!cof-set-state ?{État|mort|surpris|assomme|renverse|aveugle|affaibli|etourdi|paralyse|ralenti|immobilise|endormi|apeure|invisible|blesse|encombre} true",
        visibleto: '',
        istokenaction: false,
        inBar: true
      }, {
        name: 'enlève',
        action: "!cof-set-state ?{État|mort|surpris|assomme|renverse|aveugle|affaibli|etourdi|paralyse|ralenti|immobilise|endormi|apeure|invisible|blesse|encombre} false",
        visibleto: '',
        istokenaction: false,
        inBar: true
      }, {
        name: 'Suivre',
        action: "!cof-suivre @{selected|token_id} @{target|token_id}",
        visibleto: 'all',
        istokenaction: true
      },*/
    {
      name: 'undo',
      action: "!cof2-undo",
      visibleto: '',
      istokenaction: false,
      inBar: true
    }, {
      name: PAUSE,
      action: "!cof2-pause",
      visibleto: '',
      istokenaction: false,
      inBar: true
    },
  ];

  let stateCOF = state.COFantasy;
  let reglesOptionelles; // = stateCOF.options.regles.val;
  //
  // Le script utilise la partie COFantasy de la variable d'état state
  // Pour plus de facilité, on utilise stateCOF = state.COFantasy
  // Champs utilisés:
  // - options : les options de jeu
  // - roundMarkerId : l'id du token utilisé pour l'aura d'initiative
  // - combat : défini si le jeu est en mode tour par tour, contient :
  //   - pageId        : la pageid du combat
  //   - activeTokenId : id du token dont c'est le tour
  //   - activeTokenName : nom du token dont c'est le tour, au cas où l'id change
  //   - tour          : numéro de tour dans le combat
  //   - init          : niveau d'initiative courant
  //   - armeesDesMorts : map de token id vers perso
  //   - auras         : liste des auras actives
  //   - aurasCounts   : computeur pour id des auras
  //   - usureOff      : on ne compte plus l'usure du combat
  // - personnageCibleCree : pour savoir si on a créé un personnage cible (avec 0 PV pour centrer les aoe)
  // - tablesCrees : pour savoir si on a créé les tables par défaut
  // - gameMacros : la liste des macros créées par le script
  // - chargeFantastique : tout ce dont on a besoin pour une charge fantastique en cours (TODO: passer sous combat)
  // - eventId : compteur d'events pour avoir une id unique
  // - tokensTemps : liste de tokens à durée de vie limitée, effacés à la fin du combat
  //   - tid: id du token
  //   - name: le nom du token
  //   - duree: durée restante en rounds
  //   - init: init à laquelle diminuer la durée
  //   - intrusion: distance à laquelle le token s'active
  // - tokensActifs : map de pageid vers liste de tokens qui font une action quand on passe à côté.
  //   - tid: id du token
  //   - name: le nom du token
  //   - distance: la distance d'activation (par rapport au centre). Si pas présent, il faut intersecter avec le boîte du token (sans tenir compte de la rotation)
  // - effetAuD20 : les effets qui se produisent à chaque jet de dé.
  //   chaque effet est déterminé par un champ, puis pour chaque champ,
  //   - min: valeur minimale du dé pour déclencher
  //   - max: valeur maximale du dé pour déclencher
  //   - fct: nom de la fonction à appeler
  //   - nomFin: nom à afficher pour le statut et mettre fin aux événements
  //   par exemple, foudreDuTemps pour les foudres du temps
  // - tenebresMagiques : état général de ténèbres magiques
  // - jetsEnCours : pour laisser le MJ montrer ou non un jet qui lui a été montré à lui seul
  // - currentAttackDisplay : pour pouvoir remontrer des display aux joueurs
  // - pause : le jeu est en pause
  // - afterDisplay : données à afficher après un display
  // - version : la version du script en cours, pour détecter qu'on change de version
  // - personnageCibleCree : savoir si la cible a été créée

  function trouveOuCreeCible() {
    let persos = findObjs({
      _type: 'character',
      name: 'Cible',
      controlledby: 'all'
    });
    if (persos.length > 0) return persos[0];
    let pages = findObjs({
      _type: 'page'
    });
    if (pages.length > 0) {
      let pageId = pages[0].id;
      let charCible = createObj('character', {
        name: 'Cible',
        controlledby: 'all',
        inplayerjournals: 'all',
        avatar: 'https://s3.amazonaws.com/files.d20.io/images/33041174/5JdDVh-34C-kZglTE1aq-w/max.png?1494837870',
      });
      if (charCible) {
        let attrPV = charAttribute(charCible.id, 'PV', {
          caseInsensitive: true
        });
        if (attrPV.length > 0) attrPV = attrPV[0];
        else attrPV = createObj('attribute', {
          name: 'PV',
          characterid: charCible.id,
          current: 0,
          max: 0
        });
        setAttrs(charCible.id, {
          type_personnage: 'PNJ'
        });
        let tokenCible = createObj('graphic', {
          name: 'Cible',
          layer: 'objects',
          _pageid: pageId,
          imgsrc: 'https://s3.amazonaws.com/files.d20.io/images/33041174/5JdDVh-34C-kZglTE1aq-w/thumb.png?1494837870',
          represents: charCible.id,
          width: PIX_PER_UNIT,
          height: PIX_PER_UNIT,
          bar1_link: attrPV ? attrPV.id : ''
        });
        if (tokenCible) {
          setDefaultTokenForCharacter(charCible, tokenCible);
          tokenCible.remove();
        }
        return charCible;
      }
    }
  }

  function registerMarkerEffet(effet, mEffet) {
    let md = mEffet.customStatusMarker;
    if (md) {
      let m = markerCatalog[md];
      if (m) {
        mEffet.statusMarker = m.tag;
        effet_de_marker[m.tag] = effet;
        return;
      }
      log("Il manque le marker custom " + md + " pour l'effet " + effet);
    }
    let ms = mEffet.statusMarker;
    if (ms) {
      if (effet_de_marker[ms] && effet_de_marker[ms] != effet) {
        sendChat('COF', effet_de_marker[ms] + " et " + effet + " ont le même icone");
      }
      effet_de_marker[ms] = effet;
    }
  }

  function marqueursEtatPersonnalises() {
    // Récupération des token Markers attachés à la campagne image, nom, tag, Id
    const markers = JSON.parse(Campaign().get('token_markers'));
    markers.forEach(function(m) {
      markerCatalog[m.name] = m;
    });
    if (stateCOF.options.affichage.val.markers_personnalises.val) {
      const cof_states_perso = {
        affaibli: 'status_cof-affaibli',
        apeure: 'status_cof-apeure',
        assomme: 'status_cof-assomme',
        aveugle: 'status_cof-aveugle',
        blesse: 'status_cof-blesse',
        chef: 'status_cof-chef',
        encombre: 'status_cof-encombre',
        endormi: 'status_cof-endormi',
        essoufle: 'status_cof-essoufle',
        etourdi: 'status_cof-etourdi',
        immobilise: 'status_cof-immobilise',
        invalide: 'status_cof-invalide',
        invisible: 'status_cof-invisible',
        paralyse: 'status_cof-paralyse',
        penombre: 'status_cof-penombre',
        ralenti: 'status_cof-ralenti',
        renverse: 'status_cof-renverse',
        surpris: 'status_cof-surpris',
      };
      // On boucle sur la liste des états pour vérifier que les markers sont bien présents !
      let markersAbsents = [];
      let ancientSet = true;
      for (let etat in cof_states_perso) {
        let markerName = cof_states_perso[etat].substring(7);
        let marker_perso = markerCatalog[markerName];
        if (marker_perso) {
          cof_states[etat] = 'status_' + marker_perso.tag;
          ancientSet = false;
        } else {
          markersAbsents.push(markerName);
        }
      }
      // Cas des markers d'effet temporaire, 3 cas particuliers :
      // uniquement le tag sans "status_" devant
      for (let effet in messageEffetTemp) {
        let m = messageEffetTemp[effet];
        registerMarkerEffet(effet, m);
      }
      for (let effet in messageEffetCombat) {
        let m = messageEffetCombat[effet];
        registerMarkerEffet(effet, m);
      }
      if (!ancientSet) {
        markersAbsents.forEach(function(m) {
          log("Marker " + m + " introuvable");
        });
        log("Markers personnalisés activés.");
      } else {
        log("Utilisation des markers par défaut");
      }
    }
    for (let etat in cof_states) {
      let marker = cof_states[etat].substring(7);
      etat_de_marker[marker] = etat;
    }
  }

  function mettreMacrosAJour() {
    let macros = findObjs({
      _type: 'macro'
    });
    let players = findObjs({
      _type: 'player'
    });
    let mjs = [];
    players.forEach(function(p) {
      if (playerIsGM(p.id)) mjs.push(p.id);
    });
    let inBar = [];
    if (stateCOF.gameMacros) {
      //Check modified or removed macros
      stateCOF.gameMacros.forEach(function(gm) {
        let ngm = gameMacros.find(function(ngm) {
          return ngm.name == gm.name;
        });
        if (ngm) {
          if (ngm.action == gm.action && ngm.visibleto == gm.visibleto && ngm.istokenaction == gm.istokenaction) return;
          macros.forEach(function(m) {
            if (m.get('name') != ngm.name) return;
            if (ngm.action != gm.action && m.get('action') == gm.action)
              m.set('action', ngm.action);
            if (ngm.visibleto != gm.visibleto && m.get('visibleto') == gm.visibleto)
              m.set('visibleto', ngm.visibleto);
            if (ngm.istokenaction != gm.istokenaction && m.get('istokenaction') == gm.istokenaction)
              m.set('istokenaction', ngm.istokenaction);
            sendChat('COF', '/w GM Macro ' + ngm.name + ' mise à jour.');
          });
        } else {
          ngm = gameMacros.find(function(ngm) {
            return ngm.oldName == gm.name;
          });
          if (ngm) {
            macros.forEach(function(m) {
              if (m.get('name') != ngm.oldName) return;
              if (ngm.action == gm.action && ngm.visibleto == gm.visibleto && ngm.istokenaction == gm.istokenaction) {
                sendChat('COF', '/w GM Macro ' + gm.name + ' change de nom et devient ' + ngm.name);
              }
              m.set('name', ngm.name);
              if (ngm.action != gm.action && m.get('action') == gm.action)
                m.set('action', ngm.action);
              if (ngm.visibleto != gm.visibleto && m.get('visibleto') == gm.visibleto)
                m.set('visibleto', ngm.visibleto);
              if (ngm.istokenaction != gm.istokenaction && m.get('istokenaction') == gm.istokenaction)
                m.set('istokenaction', ngm.istokenaction);
              sendChat('COF', '/w GM Macro ' + ngm.name + ' mise à jour.');
            });
          } else {
            macros.forEach(function(m) {
              if (m.get('name') != gm.name) return;
              if (m.get('action') != gm.action) return;
              m.remove();
              sendChat('COF', '/w GM Macro ' + gm.name + ' effacée.');
            });
          }
        }
      });
      //Nouvelles macros
      gameMacros.forEach(function(ngm) {
        let gm = stateCOF.gameMacros.find(function(gm) {
          return ngm.name == gm.name;
        });
        if (!gm) {
          let prev =
            macros.find(function(macro) {
              return macro.get('name') == ngm.name;
            });
          if (prev === undefined) {
            sendChat('COF', '/w GM Macro ' + ngm.name + ' créée.');
            if (ngm.inBar) inBar.push(ngm.name);
            mjs.forEach(function(playerId, i) {
              if (i === 0 || ngm.visibleto === '') {
                ngm.playerid = playerId;
                createObj('macro', ngm);
              }
            });
          }
        }
      });
    } else {
      //Peut-être la première fois, vérifier les macros
      gameMacros.forEach(function(m) {
        let prev =
          macros.find(function(macro) {
            return macro.get('name') == m.name;
          });
        if (prev === undefined) {
          sendChat('COF', '/w GM Macro ' + m.name + ' créée.');
          if (m.inBar) inBar.push(m.name);
          mjs.forEach(function(playerId, i) {
            if (i === 0 || m.visibleto === '') {
              m.playerid = playerId;
              createObj('macro', m);
            }
          });
        }
      });
    }
    if (inBar.length > 0) {
      sendChat('COF', "/w GM Macros à mettre dans la barre d'action du MJ : " + inBar.join(', '));
    }
    stateCOF.gameMacros = gameMacros;
  }

  //Première fonction appelée au lancement du script
  //Mise à jour de variables globales
  //C'est aussi là qu'on appelle la mise à jour des versions
  function initializeGlobalState() {
    state.COFantasy = state.COFantasy || {
      combat: false,
      eventId: 0,
      version: scriptVersion,
      options: {},
    };
    stateCOF = state.COFantasy;
    // Les options de jeu
    if (stateCOF.options === undefined) stateCOF.options = {};
    copyOptions(stateCOF.options, defaultOptions);
    reglesOptionelles = stateCOF.options.regles.val;
    updateVersion(stateCOF.version);
    stateCOF.predicats = {}; //prédicats par charId.
    // remettre à jour les ids
    if (stateCOF.roundMarkerId) {
      roundMarker = getObj('graphic', stateCOF.roundMarkerId);
      if (roundMarker === undefined) {
        log("Le marqueur d'init a changé d'id");
        let roundMarkers = findObjs({
          _type: 'graphic',
          represents: '',
          name: 'Init marker',
        });
        if (roundMarkers.length > 0) {
          roundMarker = roundMarkers[0];
          stateCOF.roundMarkerId = roundMarker.id;
          roundMarkers.forEach(function(rm) {
            if (rm.id != roundMarker.id) rm.remove();
          });
        } else {
          roundMarker = undefined;
          stateCOF.roundMarkerId = undefined;
        }
      }
    }
    let combat = stateCOF.combat;
    if (combat && combat.pageId) {
      let pageCombat = getObj('page', combat.pageId);
      if (pageCombat === undefined) {
        if (stateCOF.roundMarkerId && roundMarker) {
          combat.pageId = roundMarker.get('pageid');
        } else {
          combat.pageId = Campaign().get('playerpageid');
        }
      }
    }
    if (!stateCOF.personnageCibleCree) {
      trouveOuCreeCible();
      stateCOF.personnageCibleCree = true;
    }
    marqueursEtatPersonnalises();
    mettreMacrosAJour();
    //Écriture de l'attribut de version du script pour la fiche
    let characters = findObjs({
      _type: 'character'
    });
    characters.forEach(function(c) {
      scriptVersionToCharacter(c, 10);
    });
    //On vérifie s'il y a des commandes en attente
    let allAttrs = findObjs({
      _type: 'attribute',
    });
    allAttrs.forEach(function(attr) {
      if (attr.get('name') == 'cofantasy') treatSheetCommand(attr);
    });
    //Prise en compte des handouts
    const handout = findObjs({
      _type: 'handout'
    });
    handout.forEach(parseHandout);
  }

  function updateVersion(version) {
    if (version == scriptVersion) return; //Le script est à jour
    stateCOF.version = scriptVersion;
  }

  //Si essai est > 8 on ne tente pas de relire les attributs
  function scriptVersionToCharacter(character, essai = 1) {
    let charId = character.id;
    //On vérifie que les attributs sont peuplés
    let attrs = findObjs({
      _type: 'attribute',
      _characterid: charId,
    });
    if (attrs.length === 0) {
      if (essai < 9) {
        _.delay(function() {
          scriptVersionToCharacter(character, essai + 1);
        }, 2000);
        return;
      }
    }
    attrs = findObjs({
      _type: 'attribute',
      _characterid: charId,
      name: 'scriptVersion',
    }, {
      caseInsensitive: true
    });
    if (attrs.length === 0) {
      let attr = createObj('attribute', {
        characterid: charId,
        name: 'scriptVersion',
        current: true,
        max: stateCOF.version
      });
      attr.setWithWorker({
        current: true,
        max: stateCOF.version
      });
    } else {
      if (attrs.length > 1) {
        for (let i = 1; i < attrs.length; i++) {
          attrs[i].remove();
        }
      }
      attrs[0].setWithWorker({
        current: true,
        max: stateCOF.version
      });
    }
  }

  //Historique de commandes avec undo
  let eventHistory = [];
  /*
  function logEvents() {
    let l = eventHistory.length;
    log("Historique de taille " + l);
    eventHistory.forEach(function(evt, i) {
      log("evt " + i);
      log(evt);
    });
  }*/

  /* Événements, utilisés pour les undo, en particulier undo pour refaire
   * une action quand une règle le permet (utilisation de points de chance, etc..)
   * Champ d'un événement (variables evt en général dans le code):
   * id               : identificateur unique (int)
   * type             : description de l'événement (string)
   * affectes         : liste de tokens affectés par l'événement
   * tokens           : liste des tokens créés
   * deletedTokens    : liste de tokens effacés
   * !!!!! -> ne garde pas les tokens effacés si on n'est pas sûr que son image est au bon endroit. Typiquement, on ne va le faire que pour les tokens crées dans le script
   * attributes       : liste de attributs créés ou modifiés
   * deletesAttributes: lites des attributs effacés
   * characters       : liste des personnages créés
   * characterNames   : liste de character * name
   * defaultTokens    : liste de tokens par défaut (objet)
   *   (character, defaultToken)
   * deletedCharacters: liste des personnages effacés
   * combat           : valeur de la variable d'état combat
   * updateNextInitSet: valeur de l'ensemble des tokens dont il faut recalculer l'init
   * turnorder        : le turnorder (si il a changé)
   * initiativepage   : true si le turnorder est actif
   * personnage       : le perso qui 'fait' l'événement
   * succes           : stoque si l'attaque était un succès (bool)
   * action           : sauvegarde des paramètres de l'evt, pour la rejouer
   *   - caracteristique : carac testée (pour un jet)
   *   - titre : titre du jet
   *   - playerId : id du joueur qui a lancé l'action
   *   - selected : cibles sélectionnés des l'action
   *   - attaquant: personnage attaquant (TODO: voir si doublon avec personnage)
   *   - cibles: liste des cibles d'attaque, avec leurs tags
   *   - weaponStats: stats de l'arme (ou attaque) utilisée
   *   - rolls: les jets de l'action, pour les avoir à l'identique
   *     les dégâts sont stoqués dans chaque cible, dans cible.rollsDmg
   *     - attack: les jets de l'attaque
   *     - etat_e_index_targetid: save pour entrer dans l'état e
   *     - effet_e_index_targetid: save pour l'effet e
   *     - attaquant_pietinement_targetid: jet de l'attaquant pour le piétinement
   *     - defenseur_pietinement_targetid: jet de du défenseur pour le piétinement
   *   - options : options de l'action
   * attenteResultat  : permet de savoir que le jet est en attente de décision pour savoir si c'est un succès ou non (quand il n'y a pas de difficulté donnée et que le personnage est sous l'emprise d'une malédiction)
   */

  function addEvent(evt) {
    if (evt.id) {
      error("Tentative d'ajouter un événement déjà dans l'historique", evt);
      return;
    }
    evt.id = stateCOF.eventId++;
    eventHistory.push(evt);
    if (eventHistory.length > HISTORY_SIZE) {
      eventHistory.shift();
    }
  }

  function findEvent(id) {
    return eventHistory.find(function(evt) {
      return (evt.id == id);
    });
  }

  function lastEvent() {
    let l = eventHistory.length;
    if (l === 0) return undefined;
    return eventHistory[l - 1];
  }

  function setDefaultTokenFromSpec(character, spec, token) {
    let oldTokenFields = {};
    for (const field in spec) {
      if (field.startsWith('_')) continue;
      if (field == 'imgsrc' || field == 'represents' || field == 'top' ||
        field == 'left' || field == 'page_id' || field == 'layer' ||
        field == 'lastmove') continue;
      let oldValue = token.get(field);
      if (oldValue == spec[field]) continue;
      oldTokenFields[field] = oldValue;
      token.set(field, spec[field]);
    }
    setDefaultTokenForCharacter(character, token);
    for (const otf in oldTokenFields) {
      token.set(otf, oldTokenFields[otf]);
    }
  }

  //Si evt n'est pas défini, annule le dernier evt
  function undoEvent(evt) {
    if (evt === undefined) {
      if (eventHistory.length === 0) {
        sendChat('COF', "/w GM Historique d'événements vide");
        return;
      }
      evt = eventHistory.pop();
    } else {
      eventHistory = eventHistory.filter(function(e) {
        return (e.id != evt.id);
      });
    }
    if (evt === undefined) {
      error("Pas d'événement à annuler", eventHistory);
      return;
    }
    sendChat("COF", "/w GM undo " + evt.type);
    if (evt.affectes) undoTokenEffect(evt);
    if (evt.attributes) {
      // some attributes where modified too
      evt.attributes.forEach(function(attr) {
        if (attr.current === undefined) attr.attribute.remove();
        else {
          let aset = {
            current: attr.current
          };
          if (attr.max !== undefined) aset.max = attr.max;
          if (attr.name !== undefined) aset.name = attr.name;
          if (attr.withWorker) attr.attribute.setWithWorker(aset);
          else attr.attribute.set(aset);
        }
      });
    }
    if (evt.characterNames) {
      evt.characterNames.forEach(function(cn) {
        if (cn.name && cn.character)
          cn.character.set('name', cn.name);
      });
    }
    if (evt.defaultTokens) {
      evt.defaultTokens.forEach(function(dt) {
        //On cherche d'abord un token qui représente dt.character
        let tokens = findObjs({
          _type: 'graphic',
          represents: dt.character.id
        });
        if (tokens.length === 0) return;
        setDefaultTokenFromSpec(dt.character, dt.defaultToken, tokens[0]);
      });
    }
    if (evt.deletedTokens) {
      evt.deletedTokens.forEach(function(token) {
        log("On recrée le token " + token.name);
        let t = createObj('graphic', token);
        if (token.layer == 'map') toFront(t);
      });
    }
    if (evt.deletedCharacters) {
      evt.deletedCharacters.forEach(function(character) {
        log("On recrée le personnage " + character.name);
        let newCharacter =
          createObj('character', {
            name: character.name,
            avatar: character.avatar
          });
        let charId = newCharacter.id;
        let tokens = findObjs({
          _type: 'graphic',
          represents: character.id
        });
        tokens.forEach(function(tok) {
          tok.set('represents', charId);
        });
        eventHistory.forEach(function(evt2) {
          if (evt2.characters) {
            evt2.characters = evt2.characters.map(function(oldCharac) {
              if (oldCharac.id == character.id) return newCharacter;
              return oldCharac;
            });
          }
          if (evt2.deletedAttributes) {
            evt2.deletedAttributes.forEach(function(attr) {
              if (attr.get('characterid') == character.id) attr.newCharId = charId;
            });
          }
        });
        if (evt.deletedAttributes) {
          evt.deletedAttributes.forEach(function(attr) {
            if (attr.get('characterid') == character.id) {
              attr.newCharId = charId;
            }
          });
        }
        //Maintenant on remet les attributs
        if (character.attributes) {
          character.attributes.forEach(function(attr) {
            let oldId = attr.id;
            let newAttr = createObj('attribute', {
              characterid: charId,
              name: attr.get('name'),
              current: attr.get('current'),
              max: attr.get('max')
            });
            eventHistory.forEach(function(evt) {
              if (evt.attributes) {
                evt.attributes.forEach(function(attr) {
                  if (attr.attribute.id == oldId) attr.attribute = newAttr;
                });
              }
            });
            tokens.forEach(function(tok) {
              if (tok.get('bar1_link') == oldId)
                tok.set('bar1_link', newAttr.id);
            });
          });
        }
        if (character.abilities) {
          character.abilities.forEach(function(ab) {
            createObj('ability', {
              characterid: charId,
              name: ab.get('name'),
              action: ab.get('action'),
              istokenaction: ab.get('istokenaction')
            });
          });
        }
        // On le remet chez ses alliés
        if (character.allies.length > 0) {
          Object.values(character.allies).forEach(function(allie) {
            let alliesPerso = alliesParPerso[allie] || new Set();
            alliesPerso.add(charId);
            alliesParPerso[allie] = alliesPerso;
          });
        }
      });
    }
    // TODO: deletedAttributes a un coût quadratique en la taille de l'historique
    if (evt.deletedAttributes) {
      evt.deletedAttributes.forEach(function(attr) {
        let oldId = attr.id;
        let nameDel = attr.get('name');
        log("Restoration de l'attribut " + nameDel);
        let newAttr =
          createObj('attribute', {
            characterid: attr.newCharId || attr.get('characterid'),
            name: nameDel,
            current: attr.get('current'),
            max: attr.get('max')
          });
        eventHistory.forEach(function(evt) {
          if (evt.attributes !== undefined) {
            evt.attributes.forEach(function(attr2) {
              if (attr2.attribute && attr2.attribute.id == oldId) attr2.attribute = newAttr;
            });
          }
        });
      });
    }
    if (evt.characters) {
      evt.characters.forEach(function(character) {
        let charId = character.id;
        findObjs({
          _type: 'attribute',
          _characterid: charId
        }).forEach(function(attr) {
          attr.remove();
        });
        findObjs({
          _type: 'ability',
          _characterid: charId
        }).forEach(function(ab) {
          ab.remove();
        });
        character.remove();
      });
    }
    if (evt.tokens) {
      evt.tokens.forEach(function(token) {
        if (stateCOF.tokensTemps) {
          stateCOF.tokensTemps = stateCOF.tokensTemps.filter(function(tt) {
            return tt.tid != token.id;
          });
        }
        token.remove();
      });
    }
    if (evt.movedTokens) {
      evt.movedTokens.forEach(function(movedToken) {
        movedToken.token.set('left', movedToken.oldPosition.left);
        movedToken.token.set('top', movedToken.oldPosition.top);
      });
    }
    if (_.has(evt, 'combat')) {
      let combat = stateCOF.combat;
      //regarde si le token actif a changé
      if (evt.combat &&
        (!combat || evt.combat.activeTokenId != combat.activeTokenId) &&
        stateCOF.options.affichage.val.init_dynamique.val) {
        let activeToken = getObj('graphic', evt.combat.activeTokenId);
        if (activeToken) {
          threadSync++;
          activateRoundMarker(threadSync, activeToken);
        }
      }
      stateCOF.combat = evt.combat;
    }
    if (_.has(evt, 'updateNextInitSet'))
      updateNextInitSet = evt.updateNextInitSet;
    if (_.has(evt, 'turnorder')) Campaign().set('turnorder', evt.turnorder);
    if (_.has(evt, 'initiativepage'))
      Campaign().set('initiativepage', evt.initiativepage);
    if (evt.chargeFantastique)
      stateCOF.chargeFantastique = evt.chargeFantastique;
    if (evt.deletedTokensTemps && evt.deletedTokensTemps.length > 0) {
      stateCOF.tokensTemps = stateCOF.tokensTemps || [];
      evt.deletedTokensTemps.forEach(function(tt) {
        log("Restoring temp token " + tt.deletedToken.name);
        let t = createObj('graphic', tt.deletedToken);
        if (tt.deletedToken.layer == 'map') toFront(t);
        delete tt.deletedToken;
        tt.tid = t.id;
        stateCOF.tokensTemps.push(tt);
      });
    }
    if (evt.tokensTemps) { //ceux pour lesquels on a diminué la durée
      evt.tokensTemps.forEach(function(tt) {
        if (tt.tt) tt.tt.duree = tt.ancienneDuree;
      });
    }
  }

  function undoTokenEffect(evt) {
    let HTdeclared;
    try {
      HTdeclared = HealthColors;
    } catch (e) {
      if (e.name != "ReferenceError") throw (e);
    }
    _.each(evt.affectes, function(aff) {
      let prev = aff.prev;
      let tok = aff.affecte;
      if (prev === undefined || tok === undefined) {
        error("Pas d'état précédant", aff);
        return;
      }
      let prevTok;
      if (HTdeclared) prevTok = JSON.parse(JSON.stringify(tok));
      _.each(prev, function(val, key) {
        tok.set(key, val);
      });
      if (HTdeclared) HealthColors.Update(tok, prevTok);
      sendChat("COF", "État de " + tok.get("name") + " restauré.");
    });
  }

  //pour se débarasser des balises html
  // et avoir un tableau de lignes
  function linesOfNote(note) {
    note = note.trim();
    if (note.startsWith('<p>')) note = note.substring(3);
    note = note.trim().replace(/<span[^>]*>|<\/span>/g, '');
    note = note.replace(/<p>/g, '<br>');
    note = note.replace(/<\/p>/g, '');
    return note.trim().split('<br>');
  }

  function normalizeTokenImg(img) {
    let m = img.match(/(.*\/images\/.*)(thumb|med|original|max)([^?]*)(\?[^?]+)?$/);
    if (!m || m.length < 4) {
      error("Impossible d'utiliser l'image " + img, img);
      return img;
    }
    let body = m[1];
    let extension = m[3];
    let query;
    if (m.length > 4 && m[4]) query = m[4];
    else query = '?' + randomInteger(9999999);
    return body + 'thumb' + extension + query;
  }

  // Interface dans le chat ---------------------------------------------

  function boutonSimple(action, texte, style) {
    action = action.replace(/%/g, '&#37;').replace(/\)/g, '&#41;').replace(/\?/g, '&#63;').replace(/@/g, '&#64;').replace(/\[/g, '&#91;').replace(/]/g, '&#93;').replace(/"/g, '&#34;').replace(/{/g, '&#123;').replace(/}/g, '&#125;').replace(/\|/g, '&#124;').replace(/\*/g, '&#42;');
    action = action.replace(/\'/g, '&apos;'); // escape quotes
    action = action.replace(/:/g, '&amp;#58;'); // double escape colon
    style = style || '';
    return '<a href="' + action + '"' + style + '>' + texte + '</a>';
  }

  //Gestion des attributs -----------------------------------------------

  // Donne le nom de l'attribut, selon qu'il concerne un mook ou un personnage
  // unique
  // perso peut ne pas avoir de token
  function fullAttributeName(perso, attribute, options) {
    if (perso.token && (!options || !options.charAttr)) {
      let link = perso.token.get('bar1_link');
      if (link === '') return attribute + '_MOOK_' + perso.token.get('name');
    }
    return attribute;
  }

  //Retourne une liste d'attributs
  //personnage peut ne pas avoir de token
  function tokenAttribute(personnage, name) {
    let fullName = fullAttributeName(personnage, name);
    return findObjs({
      _type: 'attribute',
      _characterid: personnage.charId,
      name: fullName
    });
  }

  function charAttribute(charId, name, option) {
    return findObjs({
      _type: 'attribute',
      _characterid: charId,
      name: name
    }, option);
  }

  function toInt(n, def) {
    let res = parseInt(n);
    if (isNaN(res)) return def;
    return res;
  }

  function attrAsInt(attr, def, defPresent) {
    if (attr.length === 0) return def;
    if (defPresent === undefined) defPresent = def;
    return toInt(attr[0].get('current'), defPresent);
  }

  function attrAsBool(attr) {
    if (attr.length === 0) return false;
    attr = attr[0].get('current');
    if (attr == '0' || attr == 'false') return false;
    if (attr) return true;
    return false;
  }

  //personnage peut ne pas avoir de token
  function attributeAsBool(personnage, name) {
    let attr = tokenAttribute(personnage, name);
    return attrAsBool(attr);
  }

  //Rempli le champ transforme, utilisé par les ficheAttribute
  function persoTransforme(perso) {
    if (perso.transforme) return;
    perso.transforme = {
      charId: false
    };
    let attrs = tokenAttribute(perso, 'changementDeForme');
    if (attrs.length === 0) return;
    let nomForme = attrs[0].get('current');
    let forme = findObjs({
      _type: 'character',
      name: nomForme
    });
    if (forme.length == 0) return;
    perso.transforme.charId = forme[0].id;
    let garde = attrs[0].get('max');
    if (garde) {
      perso.transforme.garde = {};
      let gardeEtMeilleur = garde.split('||');
      garde = gardeEtMeilleur[0].split(',');
      garde.forEach(function(g) {
        perso.transforme.garde[g] = true;
      });
      if (gardeEtMeilleur.length > 1) {
        perso.transforme.gardeMeilleur = {};
        let meilleur = gardeEtMeilleur[1].split(',');
        meilleur.forEach(function(m) {
          perso.transforme.gardeMeilleur[m] = true;
        });
      }
    }
  }

  function getCharId(perso, name, options) {
    let charId = perso.charId;
    if (options && options.transforme) {
      persoTransforme(perso);
      if (perso.transforme.charId) {
        if (perso.transforme.garde && perso.transforme.garde[name.toLowerCase()])
          return charId;
        charId = perso.transforme.charId;
      }
    }
    return charId;
  }

  function attributesInsensitive(perso, name, options) {
    return charAttribute(getCharId(perso, name, options), name, {
      caseInsensitive: true
    });
  }

  // Attention, def, la valeur par défaut, doit être la même que sur la fiche
  // personnage peut ne pas avoir de token
  // options peut contenir transforme pour utiliser cette version
  function ficheAttribute(personnage, name, def, options) {
    let attr = attributesInsensitive(personnage, name, options);
    if (attr.length === 0) return def;
    return attr[0].get('current');
  }

  //perso peut ne pas avoir de token
  // options peut contenir transforme pour utiliser cette version
  function ficheAttributeAsInt(perso, name, def, options) {
    let attr = attributesInsensitive(perso, name, options);
    let res = attrAsInt(attr, def);
    if (options && options.transforme &&
      perso.transforme.gardeMeilleur && perso.transforme.gardeMeilleur[name]) {
      attr = attributesInsensitive(perso, name);
      let orig = attrAsInt(attr, def);
      res = Math.max(def, orig);
    }
    return res;
  }

  //Il faut une valeur par défaut, qui correspond à celle de la fiche
  function ficheAttributeAsBool(personnage, name, def, options) {
    let attr = attributesInsensitive(personnage, name, options);
    if (attr.length === 0) return def;
    return attrAsBool(attr);
  }

  // triggers sheet workers
  // options peut avoir un champ msg et un champ maxVal
  // si options a un champ default, supprime la fiche si la valeur est default
  // renvoie l'attribut, sauf si on a le default
  function setFicheAttr(personnage, attribute, value, evt, options) {
    let charId = personnage.charId;
    if (options && options.msg !== undefined) {
      sendPerso(personnage, options.msg);
    }
    let attr = findObjs({
      _type: 'attribute',
      _characterid: charId,
      name: attribute
    }, {
      caseInsensitive: true
    });
    if (attr.length === 0) {
      if (options && options.maxVal === undefined && options.default === value) return;
      evt.attributes = evt.attributes || [];
      let maxval = '';
      if (options && options.maxVal !== undefined) maxval = options.maxVal;
      attr = createObj('attribute', {
        characterid: charId,
        name: attribute,
        current: value,
        max: maxval
      });
      attr.setWithWorker({
        current: value
      });
      evt.attributes.push({
        attribute: attr,
      });
      return attr;
    }
    attr = attr[0];
    if (options && options.maxVal === undefined && options.default === value) {
      evt.deletedAttributes = evt.deletedAttributes || [];
      evt.deletedAttributes.push(attr);
      attr.remove();
      return;
    }
    evt.attributes = evt.attributes || [];
    evt.attributes.push({
      attribute: attr,
      current: attr.get('current'),
      max: attr.get('max'),
      withWorker: true
    });
    let sa = {};
    sa[attribute] = value;
    if (options && options.maxVal !== undefined)
      sa[attribute + '_max'] = options.maxVal;
    setAttrs(charId, sa);
    return attr;
  }

  //Met le champ field à value du token dans evt, pour permettre le undo
  //Retourne evt.affectes[token.id]
  function affectToken(token, field, value, evt) {
    evt.affectes = evt.affectes || {};
    let aff = evt.affectes[token.id];
    if (aff === undefined) {
      aff = {
        affecte: token,
        prev: {}
      };
      evt.affectes[token.id] = aff;
    }
    if (aff.prev[field] === undefined) aff.prev[field] = value;
    return aff;
  }

  function setToken(token, field, newValue, evt) {
    let prevValue = token.get(field);
    affectToken(token, field, prevValue, evt);
    token.set(field, newValue);
  }

  // evt peut être undefined
  // options peut avoir les champs msg et secret
  function removeTokenAttr(personnage, attribute, evt, options) {
    attribute = fullAttributeName(personnage, attribute, options);
    let attr = findObjs({
      _type: 'attribute',
      _characterid: personnage.charId,
      name: attribute
    });
    if (attr.length === 0) return;
    if (options && options.msg !== undefined) {
      sendPerso(personnage, options.msg, options.secret);
    }
    attr = attr[0];
    if (evt) {
      evt.deletedAttributes = evt.deletedAttributes || [];
      evt.deletedAttributes.push(attr);
    }
    attr.remove();
    switch (attribute) {
      case 'enveloppePar':
      case 'agrippeParUnDemon':
      case 'etreinteScorpionPar':
      case 'estGobePar':
      case 'estEcrasePar':
        unlockToken(personnage, evt);
    }
  }

  //Le mouvement des tokens -------------------------------------------------

  function pauseGame() {
    if (stateCOF.pause) stateCOF.pause = false;
    else stateCOF.pause = true;
    let tokens = findObjs({
      _type: 'graphic',
      _subtype: 'token',
      layer: 'objects'
    });
    let charTreated = new Set();
    let charTreatedBlocked = new Set();
    tokens.forEach(function(token) {
      let charId = token.get('represents');
      if (charId === '') return;
      let character = getObj('character', charId);
      if (character === undefined) return;
      let charControlledby = character.get('controlledby');
      if (charControlledby === '') return;
      let controlledByPlayer = charControlledby.split(',').some(function(pid) {
        return pid == 'all' || !playerIsGM(pid);
      });
      if (!controlledByPlayer) return;
      if (stateCOF.pause) token.set('lockMovement', true);
      else {
        let linked = token.get('bar1_link') !== '';
        if (linked && charTreated.has(charId)) {
          if (!charTreatedBlocked.has(charId)) token.set('lockMovement', false);
        } else {
          const perso = {
            token,
            charId
          };
          if (linked) {
            charTreated.add(charId);
            if (persoImmobilise(perso)) {
              charTreatedBlocked.add(charId);
              return;
            }
          } else if (persoImmobilise(perso)) return;
          token.set('lockMovement', false);
          enleveDecoince(perso);
        }
      }
    });
    let macros = findObjs({
      _type: 'macro'
    });
    let macro = macros.find(function(m) {
      let action = m.get('action');
      return action == '!cof-pause';
    });
    if (stateCOF.pause) {
      if (macro) macro.set('name', PLAY);
      sendChat('COF', "Jeu en pause");
    } else {
      if (macro) macro.set('name', PAUSE);
      sendChat('COF', "Fin de la pause");
    }
  }

  function isActive(perso) {
    let inactif =
      getState(perso, 'mort') || getState(perso, 'surpris') ||
      getState(perso, 'assomme') || getState(perso, 'etourdi') ||
      getState(perso, 'paralyse') || getState(perso, 'endormi') ||
      getState(perso, 'apeure') || attributeAsBool(perso, 'statueDeBois') ||
      attributeAsBool(perso, 'souffleDeMort') || attributeAsBool(perso, 'petrifie');
    return !inactif;
  }

  function persoImmobilise(perso) {
    return (
      stateCOF.pause ||
      !isActive(perso) ||
      getState(perso, 'immobilise') ||
      attributeAsBool(perso, 'bloqueManoeuvre') ||
      attributeAsBool(perso, 'enveloppePar') ||
      attributeAsBool(perso, 'prisonVegetale') ||
      attributeAsBool(perso, 'toiles') ||
      attributeAsBool(perso, 'estGobePar') ||
      attributeAsBool(perso, 'agrippeParUnDemon') ||
      attributeAsBool(perso, 'etreinteScorpionPar') ||
      attributeAsBool(perso, 'estEcrasePar')
    );
  }

  function unlockToken(perso, evt) {
    if (!perso.token.get('lockMovement')) return;
    if (persoImmobilise(perso)) return;
    if (evt) affectToken(perso.token, 'lockMovement', true, evt);
    perso.token.set('lockMovement', false);
    enleveDecoince(perso, evt);
  }

  function enleveDecoince(perso, evt) {
    let tokenBougeAttr = tokenAttribute(perso, 'bougeGraceA');
    if (tokenBougeAttr.length === 0) return;
    if (evt) evt.deletedAttributes = evt.deletedAttributes || [];
    tokenBougeAttr.forEach(function(a) {
      let tokenBouge = getObj('graphic', a.get('current'));
      if (tokenBouge) {
        if (evt) deleteTokenWithUndo(tokenBouge, evt);
        else tokenBouge.remove();
      } else {
        let pageId = perso.token.get('pageid');
        tokenBouge = findObjs({
          _type: 'graphic',
          _pageid: pageId,
          represents: perso.charId,
          name: 'decoince ' + perso.token.get('name')
        });
        if (tokenBouge.length > 0) {
          tokenBouge = tokenBouge[0];
          if (evt) deleteTokenWithUndo(tokenBouge, evt);
          else tokenBouge.remove();
        }
      }
      if (evt) evt.deletedAttributes.push(a);
      a.remove();
    });
  }


  function tokenLockChanged(token, prev) {
    const charId = token.get('represents');
    if (charId === undefined || charId === '') return; // Uniquement si token lié à un perso
    if (token.get('lockMovement')) return; //Rien de spécial à faire
    const perso = {
      token,
      charId
    };
    const evt = {
      type: "unlock",
      deletedAttributes: []
    };
    addEvent(evt);
    affectToken(perso.token, 'lockMovement', prev.lockMovement, evt);
    enleveDecoince(perso, evt);
  }

  function doorChanged(door, prev) {
    if (!stateCOF.pause) return;
    if (prev.isOpen) return;
    if (door.get('isOpen')) {
      door.set('isOpen', false);
      let b = boutonSimple('!cof2-open-door ' + door.id, "Ouvrir");
      sendChat('COF', "/w GM " + b + " (jeu en pause)");
    }
  }

  //Le type personnage ---------------------------------------------------

  //Renvoie le token et le charId. Si l'id ne correspond à rien, cherche si
  //on trouve un nom de token, sur la page passée en argument (ou sinon
  //sur la page active de la campagne)
  function persoOfId(id, name, pageId, allPages) {
    let token = getObj('graphic', id);
    if (token === undefined) {
      if (name === undefined) return undefined;
      if (pageId === undefined) {
        pageId = Campaign().get('playerpageid');
      }
      let tokens = findObjs({
        _type: 'graphic',
        _subtype: 'token',
        _pageid: pageId,
        name: name
      });
      if (tokens.length === 0) {
        if (allPages) {
          let pages = findObjs({
            _type: 'page'
          });
          pages.find(function(p) {
            if (p.id == pageId) return false;
            if (p.get('archived')) return false;
            tokens = findObjs({
              _type: 'graphic',
              _subtype: 'token',
              _pageid: pageId,
              name: name
            });
            return tokens.length > 0;
          });
          if (tokens.length === 0) return undefined;
        } else return undefined;
      }
      if (tokens.length > 1) {
        error("Ambigüité sur le choix d'un token : il y a " +
          tokens.length + " tokens nommés " + name, tokens);
      }
      token = tokens[0];
    }
    let charId = token.get('represents');
    if (charId === '') {
      error("le token sélectionné ne représente pas de personnage", token);
      return undefined;
    }
    return {
      token,
      charId
    };
  }

  function splitIdName(idn, verbose = true) {
    let pos = (idn + '').indexOf(' ');
    if (pos < 1 || pos >= idn.length) {
      if (verbose) error("idName mal formé", idn);
      return;
    }
    let name = idn.substring(pos + 1);
    return {
      id: idn.substring(0, pos),
      name: name
    };
  }

  //Retourne le perso correspondant à un token id suivi du nom de token
  //Permet d'avoir une information robuste en cas d'interruption du script
  //peuple tokName
  function persoOfIdName(idn, pageId, allPages) {
    let sp = splitIdName(idn);
    if (sp === undefined) return;
    let perso = persoOfId(sp.id, sp.name, pageId, allPages);
    if (perso === undefined) {
      log("Impossible de trouver le personnage correspondant à " + sp.name);
      return;
    }
    perso.tokName = perso.token.get('name');
    if (perso.tokName == sp.name) return perso;
    log("En cherchant le token " + idn + ", on trouve " + perso.tokName);
    log(perso);
    return perso;
  }

  function idName(perso) {
    return perso.token.id + ' ' + perso.token.get('name');
  }

  function persoOfToken(token) {
    let charId = token.get('represents');
    if (charId === '') {
      return undefined;
    }
    return {
      token,
      charId
    };
  }

  function sendChar(charId, msg) {
    let dest = '';
    if (charId) {
      dest = 'character|' + charId;
    }
    sendChat(dest, msg);
  }

  //Chuchote le message à tous les joueurs présents qui controllent le
  //personnage, plus le MJ
  function whisperChar(charId, msg) {
    let character = getObj('character', charId);
    if (character) {
      let controlled = character.get('controlledby');
      if (controlled.includes('all')) sendChar(charId, msg);
      else {
        controlled.split(',').forEach(function(c) {
          if (c !== '' && !playerIsGM(c)) {
            let p = getObj('player', c);
            if (p && p.get('online')) {
              sendChar(charId, '/w "' + p.get('_displayname') + '" ' + msg);
            }
          }
        });
        sendChar(charId, "/w GM " + msg);
      }
    } else {
      sendChar(charId, "/w GM " + msg);
    }
  }

  function nomPerso(perso) {
    if (perso.tokName) return perso.tokName;
    if (perso.token) {
      perso.tokName = perso.token.get('name');
      return perso.tokName;
    }
    perso.tokName = ficheAttribute(perso, 'character_name', 'inconnu');
    return perso.tokName;
  }

  //perso peut ne pas avoir de token
  function sendPerso(perso, msg, secret) {
    if (perso.token && perso.token.get('bar1_link') === '') {
      msg = perso.token.get('name') + ' ' + msg;
      if (secret) {
        let character = getObj('character', perso.charId);
        if (character) {
          let controlled = character.get('controlledby');
          if (controlled.includes('all')) sendChat('', msg);
          else {
            controlled.split(',').forEach(function(c) {
              if (c !== '' && !playerIsGM(c)) {
                let p = getObj('player', c);
                if (p && p.get('online')) {
                  sendChat('', '/w "' + p.get('_displayname') + '" ' + msg);
                }
              }
            });
            sendChat('', "/w GM " + msg);
          }
        } else sendChat('', msg);
      } else sendChat('', msg);
    } else {
      if (secret) whisperChar(perso.charId, msg);
      else {
        sendChar(perso.charId, msg);
      }
    }
  }

  //pageId et charId sont optionnels
  function getTokenFields(token, pageId, charId) {
    return {
      _pageid: pageId || token.get('pageid'),
      imgsrc: token.get('imgsrc'),
      represents: charId || token.get('represents'),
      left: token.get('left'),
      top: token.get('top'),
      width: token.get('width'),
      height: token.get('height'),
      rotation: token.get('rotation'),
      layer: token.get('layer'),
      flipv: token.get('flipv'),
      fliph: token.get('fliph'),
      name: token.get('name'),
      tooltip: token.get('tooltip'),
      show_tooltip: token.get('show_tooltip'),
      controlledby: token.get('controlledby'),
      bar1_link: token.get('bar1_link'),
      bar2_link: token.get('bar2_link'),
      bar3_link: token.get('bar3_link'),
      bar1_value: token.get('bar1_value'),
      bar2_value: token.get('bar2_value'),
      bar3_value: token.get('bar3_value'),
      bar1_max: token.get('bar1_max'),
      bar2_max: token.get('bar2_max'),
      bar3_max: token.get('bar3_max'),
      bar_location: token.get('bar_location'),
      compact_bar: token.get('compact_bar'),
      aura1_radius: token.get('aura1_radius'),
      aura2_radius: token.get('aura2_radius'),
      aura1_color: token.get('aura1_color'),
      aura2_color: token.get('aura2_color'),
      aura1_square: token.get('aura1_square'),
      aura2_square: token.get('aura2_square'),
      tint_color: token.get('tint_color'),
      statusmarkers: token.get('statusmarkers'),
      showname: token.get('showname'),
      showplayers_name: token.get('showplayers_name'),
      showplayers_bar1: token.get('showplayers_bar1'),
      showplayers_bar2: token.get('showplayers_bar2'),
      showplayers_bar3: token.get('showplayers_bar3'),
      showplayers_aura1: token.get('showplayers_aura1'),
      showplayers_aura2: token.get('showplayers_aura2'),
      playersedit_name: token.get('playersedit_name'),
      playersedit_bar1: token.get('playersedit_bar1'),
      playersedit_bar2: token.get('playersedit_bar2'),
      playersedit_bar3: token.get('playersedit_bar3'),
      playersedit_aura1: token.get('playersedit_aura1'),
      playersedit_aura2: token.get('playersedit_aura2'),
      lastmove: token.get('lastmove'),
      sides: token.get('sides'),
      currentSide: token.get('currentSide'),
      lockMovement: token.get('lockMovement'),
      /* Dynamic Lighting */
      has_bright_light_vision: token.get('has_bright_light_vision'),
      has_night_vision: token.get('has_night_vision'),
      night_vision_distance: token.get('night_vision_distance'),
      emits_bright_light: token.get('emits_bright_light'),
      bright_light_distance: token.get('bright_light_distance'),
      emits_low_light: token.get('emits_low_light'),
      low_light_distance: token.get('low_light_distance'),
      light_sensitivity_multiplier: token.get('light_sensitivity_multiplier'),
      night_vision_effect: token.get('night_vision_effect'),
      has_limit_field_of_vision: token.get('has_limit_field_of_vision'),
      limit_field_of_vision_center: token.get('limit_field_of_vision_center'),
      limit_field_of_vision_total: token.get('limit_field_of_vision_total'),
      has_limit_field_of_night_vision: token.get('has_limit_field_of_night_vision'),
      limit_field_of_night_vision_center: token.get('limit_field_of_night_vision_center'),
      limit_field_of_night_vision_total: token.get('limit_field_of_night_vision_total'),
      has_directional_bright_light: token.get('has_directional_bright_light'),
      directional_bright_light_center: token.get('directional_bright_light_center'),
      directional_bright_light_total: token.get('directional_bright_light_total'),
      has_directional_dim_light: token.get('has_directional_dim_light'),
      directional_dim_light_center: token.get('directional_dim_light_center'),
      directional_dim_light_total: token.get('directional_dim_light_total'),
      light_color: token.get('light_color'),
      /* Legacy Dynamic Lighting */
      light_radius: token.get('light_radius'),
      light_dimradius: token.get('light_dimradius'),
      light_otherplayers: token.get('light_otherplayers'),
      light_hassight: token.get('light_hassight'),
      light_angle: token.get('light_angle'),
      light_losangle: token.get('light_losangle'),
      light_multiplier: token.get('light_multiplier'),
      adv_fow_view_distance: token.get('adv_fow_view_distance'),
      gmnotes: token.get('gmnotes'),
    };
  }

  //Attention, seulement faire pour les tokens avec une image dans la librairie
  //C'est toujours le cas pour un token créé par le script
  function deleteTokenWithUndo(token, evt) {
    let tokenFields = getTokenFields(token);
    evt.deletedTokens = evt.deletedTokens || [];
    evt.deletedTokens.push(tokenFields);
    token.remove();
  }

  //origin peut être un message ou un nom de joueur
  function sendPlayer(origin, msg, playerId) {
    let dest = origin;
    if (origin.who !== undefined) {
      if (origin.who === '') dest = 'GM';
      else {
        playerId = playerId || getPlayerIdFromMsg(origin);
        if (playerId == 'API' || playerIsGM(playerId)) dest = 'GM';
        else dest = origin.who;
      }
    }
    if (dest.includes('"')) {
      sendChat('COF', msg);
      log("Impossible d'envoyer des messages privés à " + dest + " car le nom contient des guillemets");
    }
    sendChat('COF', '/w "' + dest + '" ' + msg);
  }


  function getState(perso, etat) {
    let token = perso.token;
    let charId = perso.charId;
    let res = false;
    let attrInvisible = tokenAttribute(perso, 'tokenInvisible');
    if (attrInvisible.length > 0 && token.id == attrInvisible[0].get('max')) {
      let tokenInvisible = getObj('graphic', attrInvisible[0].get('current'));
      if (tokenInvisible) token = tokenInvisible;
    }
    if (token !== undefined) {
      res = token.get(cof_states[etat]);
      if (token.get('bar1_link') === '') return res;
      // Sinon, on a un token lié, il vaut mieux regarder la fiche
      if (charId === undefined) charId = token.get('represents');
      perso.charId = charId;
    }
    if (charId === '') {
      error("token lié mais qui ne représente pas de personnage", token);
      return false;
    }
    let cr = false;
    switch (etat) {
      case 'affaibli':
      case 'aveugle':
      case 'essoufle':
      case 'etourdi':
      case 'immobilise':
      case 'invalide':
      case 'paralyse':
      case 'ralenti':
      case 'renverse':
      case 'surpris':
        // État géré par la fiche
        let r = ficheAttributeAsInt(perso, 'condition_' + etat, 0);
        cr = r !== 0;
        break;
      default:
        {
          let attr = findObjs({
            _type: 'attribute',
            _characterid: charId,
            name: etat
          });
          cr = attr.length !== 0;
        }
    }
    if (!cr) {
      if (res && token !== undefined) token.set(cof_states[etat], false);
      return false;
    }
    if (!res && token !== undefined) token.set(cof_states[etat], true);
    return true;
  }

  //Le marker dynamique pour l'initiative ---------------------------------
  let roundMarker;

  const roundMarkerSpec = {
    represents: '',
    rotation: 0,
    layer: 'map',
    name: 'Init marker',
    aura1_color: '#ff00ff',
    aura2_color: '#00ff00',
    imgsrc: DEFAULT_DYNAMIC_INIT_IMG,
    shownname: false,
    light_hassight: false,
    has_bright_light_vision: false,
    has_night_vision: false,
    is_drawing: true
  };
  let threadSync = 0;

  function removeRoundMarker() {
    if (roundMarker) {
      roundMarker.remove();
      roundMarker = undefined;
      stateCOF.roundMarkerId = undefined;
    } else {
      stateCOF.roundMarkerId = undefined;
      let roundMarkers = findObjs({
        _type: 'graphic',
        represents: '',
        name: 'Init marker',
        layer: 'map',
      });
      roundMarkers.forEach(function(rm) {
        rm.remove();
      });
    }
  }

  function activateRoundMarker(sync, token) {
    if (!stateCOF.combat) {
      removeRoundMarker();
      threadSync = 0;
      return;
    }
    if (sync != threadSync) return;
    if (token) {
      // Cas spécial du cavaliers
      let pageId = token.get('pageid');
      let perso = persoOfId(token.id);
      let monteSur = tokenAttribute(perso, 'monteSur');
      let estMontePar = tokenAttribute(perso, 'estMontePar');
      let monture;
      let cavalier;
      if (monteSur.length > 0) {
        cavalier = perso;
        monture = persoOfIdName(monteSur[0].get('current'), pageId);
        if (monture !== undefined) token = monture.token;
      } else if (estMontePar.length > 0) {
        monture = perso;
        cavalier = persoOfIdName(estMontePar[0].get('current'), pageId);
      }
      removeRoundMarker();
      roundMarkerSpec._pageid = pageId;
      let tokenLayer = token.get('layer');
      if (tokenLayer !== 'objects') roundMarkerSpec.layer = tokenLayer;
      else roundMarkerSpec.layer = 'map';
      roundMarkerSpec.left = token.get('left');
      roundMarkerSpec.top = token.get('top');
      let width = (token.get('width') + token.get('height')) / 2 * flashyInitMarkerScale;
      roundMarkerSpec.width = width;
      roundMarkerSpec.height = width;
      roundMarkerSpec.imgsrc = stateCOF.options.images.val.image_init.val;
      let localImage;
      let gmNotes = token.get('gmnotes');
      try {
        gmNotes = _.unescape(decodeURIComponent(gmNotes)).replace('&nbsp;', ' ');
        gmNotes = linesOfNote(gmNotes);
        gmNotes.find(function(l) {
          if (l.startsWith('init_aura:')) {
            roundMarkerSpec.imgsrc = l.substring(10).trim();
            return true;
          }
          return false;
        });
      } catch (uriError) {
        log("Erreur de décodage URI dans la note GM de " + token.get('name') + " : " + gmNotes);
      }
      roundMarker = createObj('graphic', roundMarkerSpec);
      if (roundMarker === undefined && localImage) {
        error("Image locale de " + token.get('name') + " incorrecte (" + roundMarkerSpec.imgsrc + ")", gmNotes);
        roundMarkerSpec.imgsrc = stateCOF.options.images.val.image_init.val;
        roundMarker = createObj('graphic', roundMarkerSpec);
      }
      if (roundMarker === undefined && roundMarkerSpec.imgsrc != DEFAULT_DYNAMIC_INIT_IMG) {
        error("Image d'aura d'initiative incorrecte (" + roundMarkerSpec.imgsrc + ")", gmNotes);
        roundMarkerSpec.imgsrc = DEFAULT_DYNAMIC_INIT_IMG;
        roundMarker = createObj('graphic', roundMarkerSpec);
      }
      if (roundMarker === undefined) {
        error("Impossible de créer le token pour l'aura dynamique", roundMarkerSpec);
        return false;
      }
      stateCOF.roundMarkerId = roundMarker.id;
      if (roundMarkerSpec.layer === 'map') toFront(roundMarker);
      // Ne pas amener une monture montée en avant pour éviter de cacher le cavalier
      if (cavalier && monture) {
        toFront(monture.token);
        toFront(cavalier.token);
      } else {
        toFront(token);
      }
      setTimeout(_.bind(activateRoundMarker, undefined, sync), 200);
    } else if (roundMarker) { //rotation
      let rotation = roundMarker.get('rotation');
      roundMarker.set('rotation', (rotation + 0.5) % 365);
      let timeout = 100;
      //let page = getObj('page', roundMarker.get('pageid'));
      //if (page && (page.get('dynamic_lighting_enabled') || page.get('showlighting'))) timeout = 2000;
      setTimeout(_.bind(activateRoundMarker, undefined, sync), timeout);
    }
  }

  // si défini, callback est appelé à chaque élément de selected
  //                                             qui n'est pas un personnage
  // iter seulement sur les élément qui correspondent à des personnages
  function iterSelected(selected, iter, callback) {
    selected.forEach(function(sel) {
      let token = getObj('graphic', sel._id);
      if (token === undefined) {
        if (callback !== undefined) callback();
        return;
      }
      let charId = token.get('represents');
      if (charId === undefined || charId === "") {
        if (callback !== undefined) callback();
        return;
      }
      iter({
        token: token,
        charId: charId
      });
    });
  }

  function charactersInHandout(note, nomEquipe) {
    let names = linesOfNote(note);
    let persos = new Set();
    let characters = findObjs({
      _type: 'character',
    });
    names.forEach(function(name) {
      name = name.replace(/<(?:.|\s)*?>/g, ''); //Pour enlever les <h2>, etc
      name = name.trim();
      if (name.length === 0) return;
      let charsWithName = characters.filter(function(c) {
        return c.get('name').trim() == name;
      });
      if (charsWithName.length === 0) {
        log(name + " dans l'équipe " + nomEquipe + " est inconnu");
        return;
      }
      if (charsWithName.length > 1) {
        let nonArch = charsWithName.filter(function(c) {
          return !(c.get('archived'));
        });
        if (nonArch.length > 0) charsWithName = nonArch;
        if (charsWithName.length > 1) {
          log(name + " dans l'équipe " + nomEquipe + " est en double");
        }
      }
      charsWithName.forEach(function(character) {
        persos.add(character.id);
      });
    });
    return persos;
  }

  //Les effets temporaires -----------------------------------------------

  //Attributs possibles :
  // activation : message à l'activation
  // activationF : message à l'activation si la cible est féminine
  // actif : message de statut
  // actifF : message de statut si la cible est féminine
  // fin : message à la fin de l'effet
  // dm : permet d'infliger des dm
  // soins : soigne
  // prejudiciable: est un effet préjudiciable, qui peut être enlevé par délivrance
  // generic: admet un argument entre parenthèses
  // seulementVivant: ne peut s'appliquer qu'aux créatures vivantes
  // visible : l'effet est visible
  // msgSave: message à afficher quand on résiste à l'effet. Sera précédé de "pour "
  // entrave: effet qui immobilise, paralyse ou ralentit
  // statusMarker: marker par défaut pour l'effet
  // customStatusMarker: marker venant du set cof pour l'effet
  // eclaire: l'effet émet de la lumière. 3 champs possibles (optionnels):
  //   - distance: distance à laquelle il émet de la lumiere vive (defaut 0)
  //   - distanceFaible:distance à laquelle il émet de la lumière douce (défaut 1, si distance = 0, sinon distance x 3)
  //   - coefValeur: ajoute coefValeur * valeur à distance (defaut 0)
  // valeur: valeur par défaut, si utile
  // valeurPred: prédicat utilisé pour la valeur
  const messageEffetTemp = {
    //Les états
    affaibliTemp: {
      activation: "se sent faible",
      actif: "est affaibli",
      actifF: "est affaiblie",
      fin: "se sent moins faible",
      msgSave: "retrouver des forces",
      prejudiciable: true
    },
    apeureTemp: {
      activation: "prend peur",
      actif: "est dominé par sa peur",
      actifF: "est dominée par sa peur",
      fin: "retrouve du courage",
      msgSave: "retrouver du courage",
      prejudiciable: true,
      visible: true
    },
    assommeTemp: {
      activation: "est assommé",
      activationF: "est assommée",
      actif: "est assommé",
      actifF: "est assommée",
      fin: "reprend conscience",
      msgSave: "reprendre conscience",
      prejudiciable: true,
      visible: true
    },
    aveugleTemp: {
      activation: "n'y voit plus rien !",
      actif: "est aveuglé",
      actifF: "est aveuglée",
      fin: "retrouve la vue",
      msgSave: "retrouver la vue",
      prejudiciable: true,
      visible: true
    },
    endormiTemp: {
      activation: "s'endort",
      actif: "dort profondément",
      fin: "se réveille",
      msgSave: "résister au sommeil",
      prejudiciable: true,
      visible: true
    },
    essoufleTemp: {
      activation: "s'essoufle",
      actif: "est essouflé",
      actifF: "est essouflée",
      fin: "reprend son souffle",
      msgSave: "garder son souffle",
      prejudiciable: true,
      visible: true
    },
    etourdiTemp: {
      activation: "est étourdi : aucune action et -5 en DEF",
      activationF: "est étourdie : aucune action et -5 en DEF",
      actif: "est étourdi",
      actifF: "est étourdie",
      fin: "n'est plus étourdi",
      finF: "n'est plus étourdie",
      msgSave: "se reprendre",
      prejudiciable: true,
      visible: true
    },
    invalideTemp: {
      activation: "est invalide: pas plus de 5 m par action de mvt",
      actif: "est invalide",
      fin: "peut à nouveau marcher normalement",
      msgSave: "éviter une blessure invalidante",
      prejudiciable: true,
      visible: true
    },
    invisibleTemp: {
      activation: "disparaît",
      actif: "est invisible",
      fin: "réapparaît",
      msgSave: "ne pas devenir invisible",
      visible: true
    },
    immobiliseTemp: {
      activation: "est immobilisé : aucun déplacement possible",
      activationF: "est immobilisée : aucun déplacement possible",
      actif: "est immobilisé",
      actifF: "est immobilisée",
      fin: "n'est plus immobilisé",
      finF: "n'est plus immobilisée",
      msgSave: "pouvoir bouger",
      prejudiciable: true,
      visible: true,
      entrave: true
    },
    paralyseTemp: {
      activation: "est paralysé : aucune action ni déplacement possible",
      activationF: "est paralysée : aucune action ni déplacement possible",
      actif: "est paralysé",
      actifF: "est paralysée",
      fin: "n'est plus paralysé",
      finF: "n'est plus paralysée",
      msgSave: "ne plus être paralysé",
      prejudiciable: true,
      visible: true,
      entrave: true
    },
    penombreTemp: {
      activation: "ne voit plus très loin",
      actif: "est dans la pénombre",
      fin: "retrouve une vue normale",
      msgSave: "retrouver la vue",
      prejudiciable: true,
    },
    ralentiTemp: {
      activation: "est ralenti : une seule action, pas d'action limitée",
      activationF: "est ralentie : une seule action, pas d'action limitée",
      actif: "est ralenti",
      actifF: "est ralentie",
      msgSave: "ne plus être ralenti",
      fin: "n'est plus ralenti",
      finF: "n'est plus ralentie",
      prejudiciable: true,
      visible: true,
      entrave: true
    },
    //Autres effets temporaires
    asphyxie: {
      activation: "commence à manquer d'air",
      actif: "étouffe",
      fin: "peut à nouveau respirer",
      msgSave: "pouvoir respirer normalement",
      prejudiciable: true,
      seulementVivant: true,
      statusMarker: 'blue',
      customStatusMarker: 'cof-asphyxie',
      dm: true,
      visible: true
    },
    saignementsSang: {
      activation: "commence à saigner du nez, des oreilles et des yeux",
      actif: "saigne de tous les orifices du visage",
      fin: "ne saigne plus",
      msgSave: "ne plus saigner",
      prejudiciable: true,
      statusMarker: 'red',
      customStatusMarker: 'cof-saigne',
      dm: true,
      visible: true
    },
    prisonVegetale: {
      activation: "voit des plantes pousser et s'enrouler autour de ses jambes",
      actif: "est bloqué par des plantes",
      actifF: "est bloquée par des plantes",
      fin: "se libère des plantes",
      msgSave: "se libérer des plantes",
      prejudiciable: true,
      statusMarker: 'green',
      customStatusMarker: 'cof-prison-vegetale',
      visible: true,
      entrave: true
    },
  };

  const messageEffetCombat = {
    enflamme: {
      activation: "prend feu !",
      actif: "est en feu",
      fin: "les flammes s'éteignent",
      dm: true,
      statusMarker: 'red',
      customStatusMarker: 'cof-flamme',
    },
  };

  //Attention : ne tient pas compte de la rotation !
  function intersection(pos1, size1, pos2, size2) {
    if (pos1 == pos2) return true;
    if (pos1 < pos2) return ((pos1 + size1 / 2) > pos2 - size2 / 2);
    return ((pos2 + size2 / 2) > pos1 - size1 / 2);
  }

  function computeScale(pageId) {
    const page = getObj("page", pageId);
    let scale = parseFloat(page.get('scale_number'));
    if (isNaN(scale) || scale <= 0) return 1.0;
    let cellSize = parseFloat(page.get('snapping_increment'));
    if (!isNaN(cellSize) && cellSize > 0) scale /= cellSize;
    const unit = page.get('scale_units');
    switch (unit) {
      case 'ft':
        scale *= 0.3048;
        break;
      case 'cm':
        scale *= 0.01;
        break;
      case 'km':
        scale *= 1000;
        break;
      case 'mi':
        scale *= 1609.34;
        break;
      case 'in':
        scale *= 0.0254;
        break;
    }
    return scale;
  }

  // si le token est plus grand que thresh, réduit la distance
  function tokenSize(tok, thresh) {
    let size = (tok.get('width') + tok.get('height')) / 2;
    if (size > thresh) return ((size - thresh) / 2);
    return 0;
  }

  //Distance en pixels entre 2 tokens
  function distancePixToken(tok1, tok2) {
    let x = tok1.get('left') - tok2.get('left');
    let y = tok1.get('top') - tok2.get('top');
    return Math.sqrt(x * x + y * y);
  }

  //options peut avoir les champs:
  // - strict1 = true si on considère que tok1 doit avoir une taille nulle
  // - strict2
  // - allonge
  function distanceCombat(tok1, tok2, pageId, options) {
    if (pageId === undefined) {
      pageId = tok1.get('pageid');
    }
    options = options || {};
    //perso montés
    let pseudoTok1 = tok1;
    if (!options.strict1) {
      let perso1 = persoOfToken(tok1);
      if (perso1) {
        let attrMonture1 = tokenAttribute(perso1, 'monteSur');
        if (attrMonture1.length > 0) {
          let pseudoPerso1 = persoOfIdName(attrMonture1[0].get('current'), pageId);
          if (pseudoPerso1) pseudoTok1 = pseudoPerso1.token;
        }
      }
    }
    let pseudoTok2 = tok2;
    if (!options.strict2) {
      let perso2 = persoOfToken(tok2);
      if (perso2) {
        let attrMonture2 = tokenAttribute(perso2, 'monteSur');
        if (attrMonture2.length > 0) {
          let pseudoPerso2 = persoOfIdName(attrMonture2[0].get('current'), pageId);
          if (pseudoPerso2) pseudoTok2 = pseudoPerso2.token;
        }
      }
    }
    let scale = computeScale(pageId);
    let distance_pix = distancePixToken(pseudoTok1, pseudoTok2);
    if (!options.strict1) distance_pix -= tokenSize(pseudoTok1, PIX_PER_UNIT / 2);
    if (!options.strict2) distance_pix -= tokenSize(pseudoTok2, PIX_PER_UNIT / 2);
    if (options.allonge) distance_pix -= (options.allonge * PIX_PER_UNIT) / scale;
    if ((!options.strict1 || !options.strict2) && distance_pix < PIX_PER_UNIT * 1.3) return 0; //cases voisines
    return ((distance_pix / PIX_PER_UNIT) * scale);
  }

  function determinant(xa, ya, xb, yb) {
    return xa * yb - ya * xb;
  }

  //Calcule si le segment [a,b] intersecte le segment [c,d]
  function segmentIntersecte(a, b, c, d) {
    let d1 = determinant(b.x - a.x, b.y - a.y, c.x - a.x, c.y - a.y);
    let d2 = determinant(b.x - a.x, b.y - a.y, d.x - a.x, d.y - a.y);
    if (d1 > 0 && d2 > 0) return false;
    if (d1 < 0 && d2 < 0) return false;
    d1 = determinant(d.x - c.x, d.y - c.y, a.x - c.x, a.y - c.y);
    d2 = determinant(d.x - c.x, d.y - c.y, b.x - c.x, b.y - c.y);
    if (d1 > 0 && d2 > 0) return false;
    if (d1 < 0 && d2 < 0) return false;
    return true;
  }

  //traduction des coordonées de path en coordonées réelles sur la carte
  function translatePathCoordinates(x, y, p) {
    //D'abord on calcule les coordonnées relatives au centre
    x -= p.width / 2;
    y -= p.height / 2;
    //Puis on applique le scale
    x *= p.scaleX;
    y *= p.scaleY;
    //Puis on fait la rotation
    let c = Math.cos(p.angle);
    let s = Math.sin(p.angle);
    x = c * x + s * y;
    y = c * y - s * x;
    //Et finalement on ajoute les coordonnées du centre
    x += p.left;
    y += p.top;
    return {
      x,
      y
    };
  }

  function getWalls(page, pageId, murs) {
    if (murs) return murs;
    if (!page.get('lightrestrictmove')) return;
    murs = findObjs({
      _type: 'path',
      _pageid: pageId,
      layer: 'walls'
    });
    murs = murs.map(function(path) {
      let pa = path.get('_path');
      if (!pa) return [];
      try {
        let chemin = JSON.parse(pa);
        if (chemin.length < 2) return [];
        if (chemin[1][0] != 'L') return [];
        let p = {
          angle: path.get('rotation') / 180 * Math.PI,
          width: path.get('width'),
          height: path.get('height'),
          top: path.get('top'),
          left: path.get('left'),
          scaleX: path.get('scaleX'),
          scaleY: path.get('scaleY'),
        };
        chemin = chemin.map(function(v) {
          return translatePathCoordinates(v[1], v[2], p);
        });
        return chemin;
      } catch (error) {
        error("Erreur, chemin mal formé dans le calque d'éclairage dynamique", path);
        log(error.name + ": " + error.message);
      }
    });
    //On rajoute les portes fermées.
    let doors = findObjs({
      _type: 'door',
      _pageid: pageId,
    });
    doors.forEach(function(door) {
      if (door.get('isOpen')) return;
      let path = door.get('path');
      let x = door.get('x');
      let y = door.get('y');
      let chemin = [{
        x: x + path.handle0.x,
        y: path.handle0.y - y,
      }, {
        x: x + path.handle1.x,
        y: path.handle1.y - y,
      }];
      murs.push(chemin);
    });
    return murs;
  }

  //vérifie si de la nouvelle position on peut voir le suivi
  function obstaclePresent(nsx, nsy, pt, murs) {
    if (nsx == pt.x && nsy == pt.y) return false;
    let ps = {
      x: nsx,
      y: nsy
    };
    let obstacle = murs && murs.find(function(path) {
      if (path.length === 0) return false;
      let pc = path[0];
      return path.find(function(v, i) {
        if (i === 0) return false;
        if (isNaN(v.x) || isNaN(v.y)) return false;
        if (segmentIntersecte(ps, pt, pc, v)) return true;
        pc = v;
        return false;
      });
    });
    return obstacle;
  }

  // renvoie {selected, aoe}
  //  selected est une liste d'objets avec un seul champ, _id qui est une id de token
  //  aoe est un booléen qui indique si on a une aoe.
  function getSelected(msg, options) {
    let pageId = options.pageId;
    let selected = [];
    let enleveAuxSelected = [];
    let actif = options.lanceur;
    if (actif === undefined && !options.pasDeLanceur) {
      if (msg.selected !== undefined && msg.selected.length == 1) {
        actif = persoOfId(msg.selected[0]._id, msg.selected[0]._id, pageId);
      }
    }
    let page;
    let murs;
    let pt;
    let aoe;
    options.selection.forEach(function(cmd) {
      switch (cmd[0]) {
        case 'equipe':
          let nomEquipe = cmd.slice(1).join(' ');
          const equipe = equipes[nomEquipe];
          if (!equipe) {
            error("Équipe " + nomEquipe + " inconnue", cmd);
            return;
          }
          if (equipe.size === 0) {
            log("l'équipe " + nomEquipe + " est vide", cmd);
            return;
          }
          let tokens = findObjs({
            _type: 'graphic',
            _subtype: 'token',
            _pageid: pageId,
            layer: 'objects'
          });
          let uneCible = false;
          tokens.forEach(function(tok) {
            let tokCharId = tok.get('represents');
            if (equipe.has(tokCharId)) {
              uneCible = true;
              selected.push({
                _id: tok.id
              });
            }
          });
          if (!uneCible) {
            error("Pas de token de l'équipe " + nomEquipe + " sur la page");
          }
          return;
        case 'allies':
        case 'saufAllies':
          {
            if (options.ignoreAllies) return;
            let selection = selected;
            let saufAllies = (cmd[0] == 'saufAllies');
            if (saufAllies) selection = enleveAuxSelected;
            let actives = [];
            let allies = new Set();
            // On prend le token actif (dans msg.selected)
            if (actif) {
              actives = [actif];
              allies = alliesParPerso[actif.charId] || allies;
              if (saufAllies) allies = (new Set(allies)).add(actif.charId);
            } else {
              if (msg.selected === undefined || msg.selected.length === 0) {
                error("Pas d'allié car pas de token sélectionné", msg);
                return;
              }
              iterSelected(msg.selected, function(perso) {
                actives.push(perso);
                let alliesPerso = alliesParPerso[perso.charId];
                if (alliesPerso) {
                  alliesPerso.forEach(function(ci) {
                    allies.add(ci);
                  });
                }
                if (saufAllies) allies.add(perso.charId);
              });
            }
            let portee;
            if (cmd.length > 1) {
              portee = parseInt(cmd[1]);
              if (isNaN(portee) || portee < 0) portee = undefined;
            }
            let tokens = findObjs({
              _type: 'graphic',
              _subtype: 'token',
              _pageid: pageId,
              layer: 'objects'
            });
            tokens.forEach(function(tok) {
              let ci = tok.get('represents');
              if (ci === '') return;
              if (!allies.has(ci)) return;
              //On enlève le token actif, mais seulement pour allies
              if (cmd[0] == 'allies') {
                if (actives.indexOf(function(perso) {
                    return perso.charId == ci;
                  }) >= 0) return;
              }
              if (portee === undefined || !actif || distanceCombat(tok, actif.token, pageId) <= portee) {
                selection.push({
                  _id: tok.id
                });
              }
            });
            return;
          }
        case 'self':
          if (actif) {
            selected.push({
              _id: actif.token.id
            });
            return;
          }
          if (msg.selected === undefined) return;
          msg.selected.forEach(function(obj) {
            let inSelf = selected.findIndex(function(o) {
              return (o._id == obj._id);
            });
            if (inSelf < 0) selected.push(obj);
          });
          return;
        case 'target':
          if (cmd.length < 2) {
            error("Il manque l'id de la cible (après --target)", cmd);
            return;
          }
          selected.push({
            _id: cmd[1]
          });
          return;
        case 'disque':
        case 'disquePasseMur':
          if (options.ignoreDisque) return;
          let tokenCentre;
          let rayon;
          if (cmd.length < 3) {
            if (actif && cmd.length > 1) {
              tokenCentre = actif.token;
              rayon = parseInt(cmd[1]);
            } else {
              error("Pas assez d'arguments pour définir un disque", cmd);
              return;
            }
          } else {
            tokenCentre = getObj('graphic', cmd[1]);
            if (!tokenCentre) {
              let centre = persoOfId(cmd[1], cmd[1], pageId);
              if (centre === undefined) {
                error("le premier argument du disque n'est pas un token valide", cmd);
                return;
              }
              tokenCentre = centre.token;
            }
            pageId = tokenCentre.get('pageid');
            rayon = parseInt(cmd[2]);
          }
          if (isNaN(rayon) || rayon < 0) {
            error("Rayon du disque mal défini", cmd);
            return;
          }
          let portee = 0;
          if (cmd.length > 3) {
            portee = parseInt(cmd[3]);
            if (isNaN(portee) || portee < 0) {
              error("La portée du disque est mal formée", cmd);
              return;
            }
            if (actif === undefined) {
              error("Pas de token sélectionné pour calculer la distance du disque", msg);
              return;
            }
            if (distanceCombat(tokenCentre, actif.token, pageId, {
                strict1: true
              }) > portee) {
              sendPerso(actif, "Le centre de l'effet est placé trop loin (portée " + portee + " m)");
              return;
            }
          }
          aoe = aoe || {};
          aoe.type = 'disque';
          aoe.centre = {
            left: tokenCentre.get('left'),
            top: tokenCentre.get('top')
          };
          aoe.rayon = rayon;
          page = page || getObj("page", pageId);
          if (cmd[0] == 'disque')
            murs = getWalls(page, pageId, murs);
          let pc;
          if (murs) {
            pc = {
              x: tokenCentre.get('left'),
              y: tokenCentre.get('top')
            };
          }
          let allToksDisque =
            findObjs({
              _type: "graphic",
              _pageid: pageId,
              _subtype: 'token',
              layer: 'objects'
            });
          allToksDisque.forEach(function(obj) {
            if (actif && portee === 0 && obj.id == actif.token.id) return; //on ne se cible pas si le centre de l'aoe est soi-même
            let objCharId = obj.get('represents');
            if (objCharId === '') return;
            if (getState({
                token: obj,
                charId: objCharId
              }, 'mort')) return; //pas d'effet aux morts
            if (obj.get('bar1_max') == 0) return; // jshint ignore:line
            let objChar = getObj('character', objCharId);
            if (objChar === undefined) return;
            let distanceCentre = distanceCombat(tokenCentre, obj, pageId, {
              strict1: true
            });
            if (distanceCentre > rayon) return;
            if (murs) {
              if (obstaclePresent(obj.get('left'), obj.get('top'), pc, murs)) return;
            }
            selected.push({
              _id: obj.id
            });
          });
          if (options.targetFx) {
            spawnFx(tokenCentre.get('left'), tokenCentre.get('top'), options.targetFx, pageId);
          }
          if (tokenCentre.get('bar1_max') == 0) { // jshint ignore:line
            //C'est juste un token utilisé pour définir le disque
            tokenCentre.remove(); //On l'enlève, normalement plus besoin
            delete options.targetFx;
          }
          return;
        case 'enVue':
          let observateur = actif;
          if (cmd.length > 1) {
            observateur = persoOfId(cmd[1], cmd[1], pageId);
          }
          if (observateur === undefined) {
            error("Impossible de trouver la personne à partir de laquelle on sélectionne les tokens en vue", msg);
            return;
          }
          page = page || getObj("page", pageId);
          murs = getWalls(page, pageId, murs);
          if (murs) {
            pt = pt || {
              x: observateur.token.get('left'),
              y: observateur.token.get('top')
            };
          }
          let tokensEnVue = findObjs({
            _type: 'graphic',
            _pageid: pageId,
            _subtype: 'token',
            layer: 'objects'
          });
          tokensEnVue.forEach(function(obj) {
            if (actif && obj.id == actif.token.id) return; //on ne se cible pas si le centre de l'aoe est soi-même
            let objCharId = obj.get('represents');
            if (objCharId === '') return;
            if (obj.get('bar1_max') == 0) return; // jshint ignore:line
            let objChar = getObj('character', objCharId);
            if (objChar === undefined) return;
            if (murs) {
              if (obstaclePresent(obj.get('left'), obj.get('top'), pt, murs)) return;
            }
            selected.push({
              _id: obj.id
            });
          });
          return;
        case 'alliesEnVue':
          if (actif === undefined) {
            error("Impossible de trouver la personne dont on sélectionne les lliés en vue", msg);
            return;
          }
          let alliesEnVue = alliesParPerso[actif.charId];
          if (alliesEnVue === undefined) {
            error("Personnage sans allié", actif);
            return;
          }
          page = page || getObj("page", pageId);
          murs = getWalls(page, pageId, murs);
          if (murs) {
            pt = pt || {
              x: actif.token.get('left'),
              y: actif.token.get('top')
            };
          }
          let tokensAlliesEnVue = findObjs({
            _type: 'graphic',
            _pageid: pageId,
            _subtype: 'token',
            layer: 'objects'
          });
          tokensAlliesEnVue.forEach(function(obj) {
            if (obj.id == actif.token.id) return; //on ne se cible pas si le centre de l'aoe est soi-même
            let objCharId = obj.get('represents');
            if (objCharId === '') return;
            if (!alliesEnVue.has(objCharId)) return;
            if (obj.get('bar1_max') == 0) return; // jshint ignore:line
            let objChar = getObj('character', objCharId);
            if (objChar === undefined) return;
            if (murs) {
              if (obstaclePresent(obj.get('left'), obj.get('top'), pt, murs)) return;
            }
            selected.push({
              _id: obj.id
            });
          });
          return;
        default:
      }
    });
    if (selected.length === 0) {
      if (msg.selected) {
        selected = msg.selected.filter(function(sel) {
          let interdit = enleveAuxSelected.find(function(i) {
            return (i._id == sel._id);
          });
          return (interdit === undefined);
        });
      }
      return {
        selected,
        aoe
      };
    }
    let seen = new Set();
    selected = selected.filter(function(sel) {
      if (seen.has(sel._id)) return false;
      seen.add(sel._id);
      let interdit = enleveAuxSelected.find(function(i) {
        return (i._id == sel._id);
      });
      return (interdit === undefined);
    });
    return {
      selected,
      aoe
    };
  }

  //TODO: revoir cette liste pour COF2
  const attributesWithTokNames = new RegExp('^enveloppe($|_)|^enveloppePar($|_)|^agrippe($|_)|^agrippePar($|_)|^devore($|_)|^devorePar($|_)||^ecrase($|_)|^ecrasePar($|_)|^aGobe($|_)|^estGobePar($|_)|^etreinteImmole($|_)|^etreinteImmolePar($|_)|^etreinteScorpion($|_)|^etreinteScorpionPar($|_)|^capitaine($|_)|^suit($|_)|^estSuiviPar($|_)');

  function revelerNom(perso, ancienNom, nouveauNom, cache) {
    let character = getObj('character', perso.charId);
    if (character === undefined) {
      error("Personnage de " + nomPerso(perso) + " perdu", perso);
      return;
    }
    let name = ancienNom || character.get('name');
    let evt;
    if (cache && cache.evt) evt = cache.evt;
    else
      evt = {
        type: "Révélation de nom",
        characterNames: [],
        defaultTokens: [],
        attributes: []
      };
    evt.characterNames.push({
      character,
      name
    });
    if (!ancienNom) {
      //C'est le script qui fait le changement de nom
      nouveauNom = nouveauNom || ficheAttribute(perso, 'alias', '');
      sendChar(perso.charId, "était en réalité " + nouveauNom + " !");
      setFicheAttr(perso, 'alias', '', evt, {
        default: ''
      });
      character.set('name', nouveauNom);
      ancienNom = name;
    } else {
      nouveauNom = character.get('name');
    }
    if (!cache) {
      let allAttrs = findObjs({
        _type: 'attribute',
      });
      let attrsWithTokNames = allAttrs.filter(function(attr) {
        return attributesWithTokNames.test(attr.get('name'));
      });
      cache = {
        allAttrs,
        attrsWithTokNames,
        evt
      };
    }
    //On change aussi les prédicats qui stoquent le nom du personnage
    if (cache.attrsWithCharNames === undefined) {
      cache.attrsWithCharNames = cache.allAttrs.filter(function(attr) {
        return attr.get('name') == 'predicats_script';
      });
    }
    cache.attrsWithCharNames.forEach(function(attr) {
      let predicats = attr.get('current');
      let i = predicats.indexOf('PVPartagesAvec::' + ancienNom + '\n');
      if (i < 0) return;
      evt.attributes.push({
        attribute: attr,
        current: predicats
      });
      predicats = predicats.replace('PVPartagesAvec::' + ancienNom + '\n',
        'PVPartagesAvec::' + nouveauNom + '\n',
      );
      attr.set('current', predicats);
    });
    let traitementEnCours;
    character.get('_defaulttoken', function(defaultToken) {
      if (traitementEnCours) return;
      traitementEnCours = true;
      let defaultTokenName;
      let defaultTokenToSet;
      if (defaultToken !== '') {
        defaultToken = JSON.parse(defaultToken);
        evt.defaultTokens.push({
          character: character,
          defaultToken: {...defaultToken
          }
        });
        defaultTokenName = defaultToken.name;
        defaultToken.name = nouveauNom;
        defaultTokenToSet = true;
      }
      let tokens =
        findObjs({
          _type: 'graphic',
          _subtype: 'token',
          represents: perso.charId
        });
      tokens.forEach(function(tok) {
        let tokName = tok.get('name');
        if (defaultTokenToSet) {
          defaultTokenToSet = false;
          setDefaultTokenFromSpec(character, defaultToken, tok);
        }
        let tokAttr;
        if (tok.get('bar1_link') === '') {
          if (defaultTokenName) {
            if (tokName.startsWith(defaultTokenName)) {
              let suffix = tokName.substring(defaultTokenName.length);
              let localTokName = nouveauNom + suffix;
              setToken(tok, 'name', localTokName, evt);
              tokAttr = tokAttr || findObjs({
                _type: 'attribute',
                _characterid: perso.charId
              });
              let endName = "_" + tokName;
              tokAttr.forEach(function(attr) {
                let attrName = attr.get('name');
                if (attrName.endsWith(endName)) {
                  evt.attributes.push({
                    attribute: attr,
                    current: attr.get('current'),
                    name: attrName
                  });
                  var posEnd = attrName.length - tokName.length;
                  attrName = attrName.substring(0, posEnd) + localTokName;
                  attr.set('name', attrName);
                }
              });
              cache.attrsWithTokNames =
                cache.attrsWithTokNames.filter(function(attr) {
                  let sp = splitIdName(attr.get('current'), false);
                  if (sp === undefined) return false;
                  if (sp.id == tok.id || sp.name == tokName) {
                    evt.attributes.push({
                      attribute: attr,
                      current: attr.get('current'),
                    });
                    attr.set('current', sp.id + ' ' + localTokName);
                    return false;
                  } else {
                    return true;
                  }
                });
            } else {
              sendPerso(perso, "Pas de renommage de " + tokName);
            }
          } else {
            sendPerso(perso, "Pas de token par défaut pour " + tokName + ", ce n'est pas encore géré dans !cof2-reveler-nom");
          }
        } else {
          if (defaultTokenName && tokName == defaultTokenName) {
            setToken(tok, 'name', nouveauNom, evt);
            cache.attrsWithTokNames =
              cache.attrsWithTokNames.filter(function(attr) {
                let sp = splitIdName(attr.get('current'), false);
                if (sp === undefined) return false;
                if (sp.id == tok.id || sp.name == tokName) {
                  evt.attributes.push({
                    attribute: attr,
                    current: attr.get('current'),
                  });
                  attr.set('current', sp.id + ' ' + nouveauNom);
                  return false;
                } else {
                  return true;
                }
              });
          } else {
            sendPerso(perso, "Pas de renommage de " + tokName);
          }
        }
      });
    });
  }

  const labelsEscalier = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  function findEsc(escaliers, escName, i) {
    let fullEscName = escName + labelsEscalier[i];
    let sortieEscalier = escaliers.find(function(esc) {
      return esc.get('name') == fullEscName;
    });
    if (sortieEscalier === undefined && i > 0) return findEsc(escName, i - 1);
    return sortieEscalier;
  }

  //esc est un token, le reste est optionnel
  function trouveSortieEscalier(esc, versLeHaut, loop, escaliers, tmaps) {
    let escName; //Contiendra le nom de l'escalier vers lequel aller
    //On regarde d'abord le gmnote
    let gmNotes = esc.get('gmnotes');
    try {
      gmNotes = _.unescape(decodeURIComponent(gmNotes)).replace('&nbsp;', ' ');
      gmNotes = linesOfNote(gmNotes);
      gmNotes.find(function(l) {
        if (versLeHaut) {
          if (l.startsWith('monte:')) {
            escName = l.substring(6);
            return true;
          }
          if (l.startsWith('monter:')) {
            escName = l.substring(7);
            return true;
          }
          if (l.startsWith('bas:')) {
            escName = l.substring(4);
            return true;
          }
          return false;
        } else {
          if (l.startsWith('descend:')) {
            escName = l.substring(8);
            return true;
          }
          if (l.startsWith('descendre:')) {
            escName = l.substring(10);
            return true;
          }
          if (l.startsWith('haut:')) {
            escName = l.substring(5);
            return true;
          }
          return false;
        }
        return false;
      });
    } catch (uriError) {
      log("Erreur de décodage URI dans la note GM de " + esc.get('name') + " : " + gmNotes);
    }
    let i; //index de label si on n'utilise pas gmnote
    if (escName === undefined) {
      //Si on n'a pas trouvé, on regarde le nom
      escName = esc.get('name');
      let l = escName.length;
      if (l > 1) {
        let label = escName.substr(l - 1, 1);
        escName = escName.substr(0, l - 1);
        i = labelsEscalier.indexOf(label);
        if (versLeHaut) {
          if (i == 11) {
            if (loop) escName += labelsEscalier[0];
          } else escName += labelsEscalier[i + 1];
        } else {
          if (i === 0) {
            if (loop) escName += labelsEscalier[11];
          } else escName += labelsEscalier[i - 1];
        }
      }
    }
    if (!escName) return;
    //Ensuite on cherche l'escalier de nom escName
    let escs = escaliers;
    if (escName.startsWith('tmap_')) {
      if (!tmaps) {
        tmaps = findObjs({
          _type: 'graphic',
          layer: 'gmlayer'
        });
        tmaps = tmaps.filter(function(e) {
          return e.get('name').startsWith('tmap_');
        });
      }
      escs = tmaps;
    }
    if (!escs) {
      let pageId = esc.get('pageid');
      escs = findObjs({
        _type: 'graphic',
        _pageid: pageId,
        layer: 'gmlayer'
      });
    }
    let sortieEscalier = escs.find(function(esc2) {
      return esc2.get('name') == escName;
    });
    if (sortieEscalier === undefined && i !== undefined && loop) {
      if (i > 0) { //sortie par le plus petit
        escName = escName.substr(-1) + 'A';
        sortieEscalier = escs.find(function(esc2) {
          return esc2.get('name') == escName;
        });
      } else {
        sortieEscalier = findEsc(escs, escName.substr(-1), 10);
      }
    }
    return {
      sortieEscalier,
      tmaps
    };
  }

  //retourne true si le joueur est effectivement déplacé
  function movePlayerToPage(pid, oldPageId, newPageId) {
    if (getObj('player', pid) === undefined) return;
    const c = Campaign();
    let playerPages = c.get('playerspecificpages');
    const playersMainPage = c.get('playerpageid');
    if (!playerPages) playerPages = {};
    if ((playerPages[pid] && playerPages[pid] == oldPageId)) {
      if (playersMainPage == newPageId) {
        c.set('playerspecificpages', false);
        if (_.size(playerPages) > 1) {
          delete playerPages[pid];
          c.set('playerspecificpages', playerPages);
        }
      } else {
        playerPages[pid] = newPageId;
        c.set('playerspecificpages', false);
        c.set('playerspecificpages', playerPages);
      }
    } else if ((!playerPages[pid] && playersMainPage == oldPageId)) {
      playerPages[pid] = newPageId;
      let allPlayers = findObjs({
        _type: 'player'
      });
      let allOnNewPage = allPlayers.every(function(p) {
        if (playerIsGM(p.id)) return true;
        return playerPages[p.id] == newPageId;
      });
      c.set('playerspecificpages', false);
      if (allOnNewPage) {
        Campaign().set('playerpageid', newPageId);
      } else {
        c.set('playerspecificpages', playerPages);
      }
    }
  }

  function prendreEscalier(perso, pageId, sortieEscalier) {
    let token = perso.token;
    let left = sortieEscalier.get('left');
    let top = sortieEscalier.get('top');
    let newPageId = sortieEscalier.get('pageid');
    //Déplacement du token
    if (newPageId == pageId) {
      token.set('left', left);
      token.set('top', top);
    } else {
      //On change de carte, il faut donc copier le token
      let tokenObj = JSON.parse(JSON.stringify(token));
      tokenObj._pageid = newPageId;
      //On met la taille du token à jour en fonction des échelles des cartes.
      let ratio = computeScale(pageId) / computeScale(newPageId);
      if (ratio < 0.9 || ratio > 1.1) {
        if (ratio < 0.25) ratio = 0.25;
        else if (ratio > 4) ratio = 4;
        tokenObj.width *= ratio;
        tokenObj.height *= ratio;
      }
      tokenObj.imgsrc = normalizeTokenImg(tokenObj.imgsrc);
      tokenObj.left = left;
      tokenObj.top = top;
      let newToken = createObj('graphic', tokenObj);
      if (newToken === undefined) {
        error("Impossible de copier le token, et donc de faire le changement de carte", tokenObj);
        return;
      }
    }
    //On déplace ensuite le joueur.
    let character = getObj('character', perso.charId);
    if (character === undefined) return;
    let charControlledby = character.get('controlledby');
    if (charControlledby === '') {
      //Seul le MJ contrôle le personnage
      let players = findObjs({
        _type: 'player',
        online: true
      });
      let gm = players.find(function(p) {
        return playerIsGM(p.id);
      });
      if (gm) {
        if (newPageId != pageId) movePlayerToPage(gm.id, pageId, newPageId);
        sendPing(left, top, newPageId, gm.id, true, gm.id);
      }
    } else {
      charControlledby.split(",").forEach(function(pid) {
        if (newPageId != pageId) movePlayerToPage(pid, pageId, newPageId);
        sendPing(left, top, newPageId, pid, true, pid);
      });
    }
    //Enfin, on efface le token de départ si on a changé de page
    if (newPageId != pageId) token.remove();
  }

  //Pour ouvrir une porte sans event, en particulier en cas de pause
  // !cof2-open-door id
  function openDoor(msg, cmd, options) {
    if (cmd.length < 2) {
      error("Il manque un argument à !cof2-open-door", cmd);
      return;
    }
    let door = getObj('door', cmd[1]);
    if (door === undefined) {
      error("Impossible de trouver la porte", cmd);
      return;
    }
    door.set('isOpen', true);
  }

  //!cof2-escalier
  function commandeEscalier(msg, cmd, options) {
    let {
      selected
    } = getSelected(msg, options);
    let playerId = options.playerId;
    if (selected.length === 0) {
      sendPlayer(msg, "Pas de sélection de token pour !cof-escalier", playerId);
      log("!cof-escalier requiert de sélectionner des tokens");
      return;
    }
    let pageId = getObj('graphic', selected[0]._id).get('pageid');
    let escaliers = findObjs({
      _type: 'graphic',
      _pageid: pageId,
      layer: 'gmlayer'
    });
    if (escaliers.length === 0) {
      sendPlayer(msg, "Pas de token dans le layer GM", playerId);
      return;
    }
    let tmaps; //Les passages entre les maps.
    let versLeHaut = true;
    let loop = true;
    if (msg.content) {
      if (msg.content.includes(' bas')) {
        versLeHaut = false;
        loop = false;
      } else if (msg.content.includes(' haut')) {
        versLeHaut = true;
        loop = false;
      }
    }
    iterSelected(selected, function(perso) {
      let token = perso.token;
      let posX = token.get('left');
      let sizeX = token.get('width');
      let posY = token.get('top');
      let sizeY = token.get('height');
      let sortieEscalier;
      escaliers.forEach(function(esc) {
        if (sortieEscalier) return;
        if (intersection(posX, sizeX, esc.get('left'), esc.get('width')) &&
          intersection(posY, sizeY, esc.get('top'), esc.get('height'))) {
          let s = trouveSortieEscalier(esc, versLeHaut, loop, escaliers, tmaps);
          if (s) {
            sortieEscalier = s.sortieEscalier;
            tmaps = s.tmaps;
          }
        }
      });
      if (sortieEscalier) {
        prendreEscalier(perso, pageId, sortieEscalier);
        return;
      }
      let err = nomPerso(perso) + " n'est pas sur un escalier";
      if (!loop) {
        if (versLeHaut) err += " qui monte";
        else err += " qui descend";
      }
      sendPlayer(msg, err, playerId);
    });
  }

  //!cof2-reveler-nom [nouveau nom]
  function commandeRevelerNom(msg, cmd, options) {
    let playerId = options.playerId;
    let {
      selected
    } = getSelected(msg, options);
    if (selected.length === 0) {
      sendPlayer(msg, "Pas de token sélectionné pour !cof2-reveler-nom", playerId);
      return;
    }
    let nouveauNomToken;
    if (cmd.length > 1) nouveauNomToken = cmd.slice(1).join(' ');
    if (selected.length > 1 && nouveauNomToken) {
      sendPlayer(msg, "Attention, on ne peut sélectionner qu'un seul token quand on précise le nouveau nom des tokens", playerId);
      return;
    }
    const evt = {
      type: "Révélation de nom",
      characterNames: [],
      defaultTokens: [],
      attributes: []
    };
    addEvent(evt);
    let allAttrs = findObjs({
      _type: 'attribute',
    });
    let attrsWithTokNames = allAttrs.filter(function(attr) {
      return attributesWithTokNames.test(attr.get('name'));
    });
    let cache = {
      allAttrs,
      attrsWithTokNames,
      evt
    };
    let treated = new Set(); //On ne veut pas traiter un personnage plus d'une fois.
    iterSelected(selected, function(perso) {
      if (treated.has(perso.charId)) return;
      treated.add(perso.charId);
      revelerNom(perso, undefined, nouveauNomToken, cache);
    });
  }

  //msg peut être directement le playerId ou un message
  function getPlayerIdFromMsg(msg) {
    if (msg.playerid === undefined) return msg;
    let playerId = msg.playerid;
    if (playerId == 'API') {
      let nom = msg.who;
      if (nom === undefined) return playerId;
      nom = nom.replace(/ \(GM\)/, '');
      //On regarde si un joueur s'appelle nom
      let players = findObjs({
        type: 'player',
        displayname: nom
      });
      if (players.length === 0) {
        let characters = findObjs({
          type: 'character',
          name: nom
        });
        if (characters.length === 0) {
          //error("Impossible de trouver l'id du joueur " + nom, msg);
          return playerId;
        }
        let pids = characters[0].get('controlledby');
        pids = pids.split(',');
        if (pids[0] == 'all') {
          players = findObjs({
            type: 'player'
          });
          playerId = players[0].id;
        } else playerId = pids[0];
      } else playerId = players[0].id;
    }
    return playerId;
  }

  function getPageId(playerId) {
    let pageId;
    if (playerIsGM(playerId)) {
      let player = getObj('player', playerId);
      pageId = player.get('lastpage');
    }
    if (pageId === undefined || pageId === "") {
      let pages = Campaign().get('playerspecificpages');
      if (pages && pages[playerId] !== undefined) {
        return pages[playerId];
      }
      return Campaign().get('playerpageid');
    }
    return pageId;
  }

  //Renseigne toujours options.playerId
  function parseOptions(msg) {
    let opts = msg.content.split(' --');
    let cmd = opts.shift().split(' ');
    cmd = cmd.filter(function(c) {
      return c !== '';
    });
    let playerId = getPlayerIdFromMsg(msg);
    let firstSelected;
    if (msg.selected && msg.selected.length > 0) {
      firstSelected = getObj('graphic', msg.selected[0]._id);
      if (firstSelected === undefined) {
        error("Un token sélectionné n'est pas trouvé en interne", msg.selected);
      }
    }
    let pageId;
    if (firstSelected) {
      pageId = firstSelected.get('pageid');
    } else {
      pageId = getPageId(playerId);
    }
    let options = {
      playerId,
      pageId,
      selection: []
    };
    opts.forEach(function(arg) {
      let cmd = arg.trim().split(' ');
      switch (cmd[0]) {
        //D'abord les options de sélection, qui seront traitées plus tard, car asynchrones
        case 'equipe':
        case 'allies':
        case 'saufAllies':
        case 'self':
        case 'target':
        case 'disque':
        case 'disquePasseMur':
        case 'enVue':
        case 'alliesEnVue':
          options.selection.push(cmd);
          break;
        default:
          error("Option " + cmd[0] + " inconnue", cmd);
      }
    });
    return {
      cmd,
      options,
    };
  }

  function setTokenVision(perso, pageId) {
    //TODO: implémenter quand on aura le prédicat de vision dans le noir
    /*    let udl;
    let visionNoir = predicateAsInt(perso, 'visionDansLeNoir', 0);
    if (visionNoir > 0) {
      let vs = scaleDistance(perso, visionNoir);
      let page = getObj('page', pageId);
      udl = page && page.get('dynamic_lighting_enabled');
      if (udl) {
        token.set('has_night_vision', true);
        //token.set('night_vision_tint', '#555555');
        token.set('night_vision_distance', vs);
      } else {
        token.set('light_radius', vs);
        token.set('light_dimradius', -1);
        token.set('light_otherplayers', false);
        token.set('light_hassight', true);
        token.set('light_angle', 360);
      }
    }
    if (visionNoir <= 30 && predicateAsBool(perso, 'batonDesRunesMortes') && attributeAsBool(perso, 'runeBryniza')) {
      if (!udl) {
        let page = getObj('page', pageId);
        udl = page && page.get('dynamic_lighting_enabled');
      }
      if (udl) {
        let vs = scaleDistance(perso, 50);
        token.set('has_night_vision', true);
        token.set('night_vision_effect', 'Dimming');
        token.set('night_vision_distance', vs);
      }
    }
    if (udl) forceLightingRefresh(pageId);
    */
  }

  function descendreDeMonture(perso, pageId) {
    let attrMonteSur = tokenAttribute(perso, 'monteSur');
    if (attrMonteSur.length > 0) {
      let monture = persoOfIdName(attrMonteSur[0].get('current'), pageId);
      if (monture === undefined) {
        sendPerso(perso, "descend de sa monture");
        attrMonteSur[0].remove();
      } else {
        if (monture.token.get('pageid') != pageId) {
          sendPerso(perso, "descend de " + nomPerso(monture));
          removeTokenAttr(monture, 'estMontePar');
          removeTokenAttr(monture, 'positionSurMonture');
          attrMonteSur[0].remove();
        }
      }
    }
  }

  function synchronisationDesLumieres(perso, pageId) {
    let attrLumiere = tokenAttribute(perso, 'lumiere');
    if (attrLumiere) {
      let token = perso.token;
      attrLumiere.forEach(function(al) {
        let lumId = al.get('max');
        if (lumId == 'surToken') {
          if (!token.get('emits_bright_light') && !token.get('emits_low_light')) {
            //On cherche un token qui représente le même personnage et émet de la lumière
            let allTokens = findObjs({
              type: 'graphic',
              represents: perso.charId
            });
            let tok = allTokens.find(function(t) {
              return t.get('emits_bright_light') || t.get('emits_low_light');
            });
            if (!tok) {
              al.remove();
              return;
            }
            token.set('emits_bright_light', tok.get('emits_bright_light'));
            token.set('bright_light_distance', tok.get('bright_light_distance'));
            token.set('emits_low_light', tok.get('emits_low_light'));
            token.set('low_light_distance', tok.get('low_light_distance'));
          }
          return;
        }
        //Lumière sur un token qui suit le perso.
        let lumiere = getObj('graphic', lumId);
        if (lumiere && lumiere.get('pageid') != pageId) {
          let copyLum = createObj('graphic', {
            _pageid: pageId,
            imgsrc: lumiere.get('imgsrc'),
            left: token.get('left'),
            top: token.get('top'),
            width: 70,
            height: 70,
            layer: 'walls',
            name: lumiere.get('name'),
            emits_low_light: lumiere.get('emits_low_light'),
            low_light_distance: lumiere.get('low_light_distance'),
            emits_bright_light: lumiere.get('emits_bright_light'),
            bright_light_distance: lumiere.get('bright_light_distance'),
          });
          if (copyLum) {
            al.set('max', copyLum.id);
            lumiere.remove();
          }
        }
      });
    }
  }

  function synchronisationDesEtats(perso) {
    for (let etat in cof_states) {
      // Récupère la valeur de l'état sur la fiche
      let valEtat;
      switch (etat) {
        case 'affaibli':
        case 'aveugle':
        case 'essoufle':
        case 'etourdi':
        case 'immobilise':
        case 'invalide':
        case 'paralyse':
        case 'ralenti':
        case 'renverse':
        case 'surpris':
          valEtat = (ficheAttributeAsInt(perso, 'condition_' + etat, 0) == 1);
          break;
        default:
          valEtat = ficheAttributeAsBool(perso, etat, false);
      }
      let field = cof_states[etat];
      if (perso.token.get(field) != valEtat) perso.token.set(field, valEtat);
    }
  }

  function synchronisationDesBarres(token) {
    for (let barNumber = 1; barNumber <= 3; barNumber++) {
      let attrId = token.get('bar' + barNumber + '_link');
      if (attrId) {
        let attr = getObj('attribute', attrId);
        if (attr) {
          let fieldv = 'bar' + barNumber + '_value';
          token.set(fieldv, attr.get('current'));
          let fieldm = 'bar' + barNumber + '_max';
          token.set(fieldm, attr.get('max'));
        }
      }
    }
  }

  function numeroteNomMook(perso, tokenName, pageId) {
    let copyOf = 0;
    let tokenBaseName = tokenName;
    if (tokenBaseName.includes('%%NUMBERED%%')) {
      if (typeof TokenNameNumber !== 'undefined') return; //On laisse tokenNameNumber gérer ça
      tokenBaseName = tokenBaseName.replace('%%NUMBERED%%', '');
    } else {
      // On regarde si le nom se termine par un entier
      let lastSpace = tokenBaseName.lastIndexOf(' ');
      if (lastSpace > 0) {
        copyOf = +tokenBaseName.substring(lastSpace + 1);
        if (isNaN(copyOf)) copyOf = 0;
        else tokenBaseName = tokenBaseName.substring(0, lastSpace);
      }
    }
    let otherTokens = findObjs({
      _type: 'graphic',
      represents: perso.charId
    });
    otherTokens = otherTokens.filter(function(tok) {
      let pid = tok.get('pageid');
      const page = getObj('page', pid);
      if (page) {
        return !(page.get('archived'));
      }
      return false;
    });
    let numero = 1;
    let nePasModifier = false;
    if (typeof TokenNameNumber !== 'undefined' && tokenBaseName.length > 0) {
      if (!isNaN(tokenBaseName[tokenBaseName.length - 1]))
        nePasModifier = true;
    }
    otherTokens.forEach(function(ot) {
      if (ot.id == perso.token.id) return;
      let name = ot.get('name');
      if (nePasModifier && name == tokenBaseName) nePasModifier = false;
      if (name.startsWith(tokenBaseName)) {
        let suffixe = name.replace(tokenBaseName + ' ', '');
        if (isNaN(suffixe)) return;
        let n = parseInt(suffixe);
        if (n == copyOf) {
          if (ot.get('pageid') == pageId) copyOf = 0;
        }
        if (n >= numero) numero = n + 1;
      }
    });
    if (nePasModifier || copyOf > 0) return;
    perso.token.set('name', tokenBaseName + ' ' + numero);
  }

  function tokenAdded(token, essai = 0) {
    let tokenName = token.get('name');
    //La plupart du temps, il faut attendre un peu que le nom soit affecté
    if (tokenName === '') {
      if (essai > 10) {
        if (COF2_BETA && false)
        error("Token posé sans nom, ou alors gros lag chez Roll20", token);
      } else {
        _.delay(function() {
          tokenAdded(token, essai + 1);
        }, 50);
        return;
      }
    }
    //Maintenant, le nom du token est affecté, ou bien essai > 10 et dans ce cas, peut-être que le nom est juste vide
    let charId = token.get('represents');
    if (charId === undefined || charId === '') return;
    let perso = {
      token,
      charId
    };
    const pageId = token.get('pageid');
    setTokenVision(perso, pageId);
    synchronisationDesLumieres(perso, pageId);
    //TODO: dégainer l'arme par défaut
    if (token.get('bar1_link') === '') { //On a posé un mook
      numeroteNomMook(perso, tokenName, pageId);
    } else { //token lié
      descendreDeMonture(perso, pageId);
      synchronisationDesEtats(perso);
      synchronisationDesBarres(token);
    }
  }

  function isCarac(x) {
    switch (x) {
      case 'AGI':
      case 'CON':
      case 'FOR':
      case 'PER':
      case 'CHA':
      case 'INT':
      case 'VOL':
        return true;
      default:
        return false;
    }
  }

  function parseHandout(hand) {
    const handName = hand.get('name').trim();
    if (handName.startsWith("Equipe ")) {
      const nomEquipe = handName.substring(7);
      hand.get('notes', function(note) { // asynchronous
        const persos = charactersInHandout(note, nomEquipe);
        equipes[nomEquipe] = equipes[nomEquipe] || new Set();
        let attaqueEnMeute = false;
        persos.forEach(function(charId) {
          equipes[nomEquipe].add(charId);
          attaqueEnMeute = false; //attaqueEnMeute || charPredicateAsBool(charId, 'attaqueEnMeute');
          let ancien = alliesParPerso[charId];
          if (ancien === undefined) {
            ancien = new Set();
            alliesParPerso[charId] = ancien;
          }
          persos.forEach(function(aci) {
            if (aci == charId) return;
            ancien.add(aci);
          });
          //On ajoute les familiers
        });
        if (attaqueEnMeute) {
          persos.forEach(function(charId) {
            alliesDAttaqueEnMeute.add(charId);
          });
        }
      }); //end hand.get('notes')
    } else if (handName == 'Compétences' || handName == 'Competences') {
      listeCompetences = {
        AGI: {
          list: [],
          elts: new Set()
        },
        CON: {
          list: [],
          elts: new Set()
        },
        FOR: {
          list: [],
          elts: new Set()
        },
        PER: {
          list: [],
          elts: new Set()
        },
        CHA: {
          list: [],
          elts: new Set()
        },
        INT: {
          list: [],
          elts: new Set()
        },
        VOL: {
          list: [],
          elts: new Set()
        },
        nombre: 0
      };
      hand.get('notes', function(note) { // asynchronous
        let carac; //La carac dont on spécifie les compétences actuellement
        let lignes = linesOfNote(note);
        lignes.forEach(function(ligne) {
          ligne = ligne.trim();
          let header = ligne.split(':');
          if (header.length > 1) {
            let c = header.shift().trim().toUpperCase();
            if (!isCarac(c)) return;
            carac = c;
            ligne = header.join(':').trim();
          }
          if (ligne.length === 0) return;
          if (carac === undefined) {
            error("Compétences sans caractéristique associée", note);
            return;
          }
          let comps = ligne.split(/, |\/| /);
          comps.forEach(function(comp) {
            if (comp.length === 0) return;
            comp = comp.replace(/_/g, ' ');
            listeCompetences[carac].list.push(comp);
            listeCompetences.nombre++;
            listeCompetences[carac].elts.add(comp.toLowerCase());
          });
        });
      }); //end hand.get(notes)
    }
  }

  function recomputeAllies() {
    const handouts = findObjs({
      _type: 'handout'
    });
    alliesParPerso = {};
    alliesDAttaqueEnMeute = new Set();
    equipes = new Set();
    handouts.forEach(parseHandout);
  }

  function handoutChanged(hand, prev) {
    if (prev && prev.name && prev.name.startsWith("Equipe ")) {
      recomputeAllies();
    } else if (hand) {
      parseHandout(hand);
    }
  }

  //Actions à faire pour maintenir la cohérence des tokens qui représentent le même personnage.
  function playerPageChanged(campaign) {
    let currentMap = getObj('page', campaign.get('playerpageid'));
    let tokens = findObjs({
      _pageid: currentMap.id,
      _type: 'graphic',
      _subtype: 'token'
    });
    tokens.forEach(function(token) {
      let charId = token.get('represents');
      if (charId === undefined || charId === '') return; // Si token lié à un perso
      if (token.get('bar1_link') === '') return; // Si unique
      let perso = {
        token,
        charId
      };
      synchronisationDesEtats(perso);
      synchronisationDesLumieres(perso, currentMap.id);
    });
  }

  function treatSheetCommand(attr) {
    let jcmd = attr.get('current');
    let cmd;
    try {
      cmd = JSON.parse(jcmd);
    } catch (e) {
      error("Erreur durant l'exécution de commande de la fiche (" + jcmd + ")", attr);
      attr.remove();
      return;
    }
    if (cmd) {
      switch (cmd.action) {
        case 'alias':
          {
            let perso = {
              charId: attr.get('characterid')
            };
            revelerNom(perso, cmd.param);
            break;
          }
        default:
          error("Commande de fiche " + cmd.action + " inconnue", cmd);
      }
    }
    attr.remove();
  }

  function attributeChanged(attr) {
    let n = attr.get('name');
    if (n == 'cofantasy') treatSheetCommand(attr);
  }

  function treatCommand(msg) {
    let {
      cmd,
      options,
    } = parseOptions(msg);
    let commande = cmd[0].substring(6);
    switch (commande) {
      case 'escalier':
        commandeEscalier(msg, cmd, options);
        return;
      case 'open-door':
        openDoor(msg, cmd, options);
        return;
      case 'pause':
        pauseGame();
        return;
      case 'reveler-nom':
        commandeRevelerNom(msg, cmd, options);
        return;
      case 'undo':
        undoEvent();
        return;
    }
  }

  function replaceInline(msg) {
    if (msg.inlinerolls) {
      msg.content = _.chain(msg.inlinerolls)
        .reduce(function(m, v, k) {
          m['$[[' + k + ']]'] = v.results.total || 0;
          return m;
        }, {})
        .reduce(function(m, v, k) {
          return m.replace(k, v);
        }, msg.content)
        .value();
    }
  }

  function apiCommand(msg) {
    if (msg.type != 'api') return;
    if (!msg.content.startsWith('!cof2-')) return;
    replaceInline(msg);
    if (COF2_BETA) {
      treatCommand(msg);
    } else {
      try {
        treatCommand(msg);
      } catch (e) {
        error("Erreur durant l'exécution de " + msg.content, msg);
        log(msg);
        let errMsg = e.name;
        if (e.lineNumber) errMsg += " at " + e.lineNumber;
        else if (e.number) errMsg += " at " + e.number;
        errMsg += ': ' + e.message;
        error(errMsg, e);
      }
    }
  }

  //L'interface du script
  return {
    apiCommand,
    initializeGlobalState,
    scriptVersionToCharacter,
    tokenAdded,
    attributeChanged,
    handoutChanged,
    tokenLockChanged,
    doorChanged,
    playerPageChanged,
  };
}();

on('ready', function() {
  COFantasy2.initializeGlobalState();
  COF2_loaded = true;
  //Maintenant ce qui écoute les événements
  on('chat:message', COFantasy2.apiCommand);
  on('add:token', COFantasy2.tokenAdded);
  on('add:character', COFantasy2.scriptVersionToCharacter);
  on('change:attribute', COFantasy2.attributeChanged);
  on('change:handout', COFantasy2.handoutChanged);
  on('change:graphic:lockMovement', COFantasy2.tokenLockChanged);
  on('change:door:isOpen', COFantasy2.doorChanged);
  on('change:campaign:playerpageid', COFantasy2.playerPageChanged);
  //Initialisation terminée, message dans la console
  let load_msg = "COFantasy2 version " + state.COFantasy.version;
  if (COF2_BETA) load_msg += ' beta';
  log(load_msg + " loaded");
});
