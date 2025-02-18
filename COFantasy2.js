//Dernière modification : mar. 18 févr. 2025,  09:46
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
  const BS_BUTTON = ' style="background-color:#996600; padding:1px 2px; border-radius:5px;"';
  const DEFAULT_DYNAMIC_INIT_IMG = 'https://s3.amazonaws.com/files.d20.io/images/4095816/086YSl3v0Kz3SlDAu245Vg/thumb.png?1400535580';
  const flashyInitMarkerScale = 1.6;
  const IMG_INVISIBLE = 'https://s3.amazonaws.com/files.d20.io/images/24377109/6L7tn91HZLAQfrLKQI7-Ew/thumb.png?1476950708';
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
  let predicatsFiche = {}; //prédicats par charId, séparés en
  // - total
  // - capacites
  // - equipement
  // - attribut
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
  const optTransforme = {
    transforme: true
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

  function stringOfEtat(etat, perso) {
    if (etat == 'invisible') return etat;
    else if (etat == 'penombre') return "dans la pénombre";
    else if (etat == 'chef') return "est un leader";
    let etext = etat;
    if (etat.endsWith('e') && etat != 'invalide') {
      etext = etat.substring(0, etat.length - 1) + 'é';
    }
    if (perso === undefined) return etext;
    return etext + eForFemale(perso);
  }

  function etatRendInactif(etat) {
    let res =
      etat == 'mort' || etat == 'surpris' || etat == 'assomme' ||
      etat == 'etourdi' || etat == 'paralyse' || etat == 'endormi' ||
      etat == 'apeure';
    return res;
  }

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

  //!cof2-options
  //!cof2-options opt1 [... optn] val, met l'option à val
  //!cof2-options [opt0 ... optk] reset remet toutes les options à leur valeur patr défaut
  //Dans tous les cas, affiche les options du niveau demandé
  function commandeOptions(msg, cmd, playerId, pageId, options) {
    if (!playerIsGM(playerId)) {
      sendPlayer(msg, "Seul le MJ peut changer les options du script", playerId);
      return;
    }
    let cofOptions = stateCOF.options;
    if (cofOptions === undefined) {
      sendPlayer(msg, "Options non diponibles", playerId);
      return;
    }
    let prefix = '';
    let up;
    let defOpt = defaultOptions;
    let newOption;
    let lastCmd;
    let fini;
    let current = '';
    cmd.shift();
    cmd.forEach(function(c) {
      if (fini) {
        sendPlayer(msg, "Option " + c + " ignorée", playerId);
        return;
      }
      if (c == 'reset') {
        for (let opt in cofOptions) delete cofOptions[opt];
        copyOptions(cofOptions, defOpt);
        fini = true;
      } else if (cofOptions[c]) {
        if (cofOptions[c].type == 'options') {
          if (defOpt[c] === undefined) {
            sendPlayer(msg, "Option " + c + " inconnue dans les options par défaut", playerId);
            fini = true;
            return;
          }
          defOpt = defOpt[c].val;
          cofOptions = cofOptions[c].val;
          up = prefix;
          prefix += ' ' + c;
        } else {
          newOption = cofOptions[c];
        }
      } else {
        if (newOption) { //on met newOption à c
          let val = c;
          switch (newOption.type) {
            case 'bool':
              switch (c) {
                case 'oui':
                case 'true':
                case '1':
                  val = true;
                  break;
                case 'non':
                case 'false':
                case '0':
                  val = false;
                  break;
                default:
                  sendPlayer(msg, "L'option " + lastCmd + " ne peut être que true ou false", playerId);
                  val = newOption.val;
              }
              fini = true;
              break;
            case 'int':
              val = parseInt(c);
              if (isNaN(val)) {
                sendPlayer(msg, "L'option " + lastCmd + " est une valeur entière", playerId);
                val = newOption.val;
              }
              fini = true;
              break;
            default:
              if (current === '') current = val;
              else current += ' ' + val;
              val = current;
          }
          newOption.val = val;
        } else if (lastCmd) {
          sendPlayer(msg, "L'option " + lastCmd + " ne contient pas de sous-option " + c, playerId);
        } else {
          sendPlayer(msg, "Option " + c + " inconnue.", playerId);
        }
      }
      lastCmd = c;
    });
    let titre = "Options de COFantasy";
    if (prefix !== '') {
      titre += "<br>" + prefix + ' (';
      titre += boutonSimple('!cof2-options' + up, 'retour') + ')';
    }
    let display = startFramedDisplay(playerId, titre, undefined, {
      chuchote: true
    });
    for (let opt in cofOptions) {
      let optVu = opt.replace(/_/g, ' ');
      let line = '<span title="' + cofOptions[opt].explications + '">' +
        optVu + '</span> : ';
      let action = '!cof2-options' + prefix + ' ' + opt;
      let displayedVal = cofOptions[opt].val;
      let after = '';
      switch (cofOptions[opt].type) {
        case 'options':
          displayedVal = '<span style="font-family: \'Pictos\'">l</span>';
          break;
        case 'bool':
          action += ' ?{Nouvelle valeur de ' + optVu + '|actif,true|inactif,false}';
          if (displayedVal)
          // Bizarrement, le caractère '*' modifie la suite du tableau
            displayedVal = '<span style="font-family: \'Pictos\'">3</span>';
          else
            displayedVal = '<span style="font-family: \'Pictos\'">&midast;</span>';
          break;
        case 'int':
          action += ' ?{Nouvelle valeur de ' + optVu + '(entier)}';
          break;
        case 'image':
          action += " ?{Entrez l'url pour " + optVu + '}';
          after =
            '<img src="' + displayedVal + '" style="width: 30%; height: auto; border-radius: 6px; margin: 0 auto;">';
          displayedVal = '<span style="font-family: \'Pictos\'">u</span>';
          break;
        case 'son':
          action += " ?{Entrez le nom du son pour " + optVu + '}';
          if (displayedVal === '') {
            displayedVal = '<span title="pas de son" style="font-family: \'Pictos Custom\'">u</span>';
          } else {
            after = boutonSimple('!cof2-jouer-son ' + displayedVal,
              '<span style="font-family: \'Pictos\'">&gt;</span> ');
            displayedVal = '<span title="' + displayedVal + '" style="font-family: \'Pictos\'">m</span>';
          }
          break;
        default:
          action += ' ?{Nouvelle valeur de ' + optVu + '}';
      }
      line += boutonSimple(action, displayedVal) + after;
      addLineToFramedDisplay(display, line);
    }
    addLineToFramedDisplay(display, boutonSimple('!cof2-options' + prefix + ' reset', 'Valeurs par défaut'), 70);
    sendFramedDisplay(display);
  }

  const PAUSE = String.fromCharCode(0x23F8);
  const PLAY = String.fromCharCode(0x23F5);
  const UNDO = String.fromCharCode(0x21B6);
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
      },*/
    {
      name: 'Bouger',
      action: "!cof2-bouger",
      visibleto: '',
      istokenaction: false,
      inBar: true
    }, {
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
    }, {
      name: 'Fin-combat',
      action: "!cof2-fin-combat",
      visibleto: '',
      istokenaction: false,
      inBar: true
    }, {
      name: 'Init',
      action: "!cof2-init",
      visibleto: '',
      istokenaction: false,
      inBar: true
    }, {
      name: 'Jets',
      action: "!cof2-jet",
      visibleto: 'all',
      istokenaction: true,
    }, {
      name: 'Jets-GM',
      action: "!cof2-jet --secret",
      visibleto: '',
      istokenaction: false,
      inBar: true
    }, {
      name: 'Jet-chance',
      action: "!cof2-jet-chance",
      visibleto: '',
      istokenaction: false,
      inBar: false
    },
    /*{
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
               },*/
    {
      name: 'Éteindre',
      action: "!cof2-eteindre-lumiere ?{Quelle lumière?|Tout}",
      visibleto: '',
      istokenaction: false,
      inBar: true
    },
    /*{
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
      name: UNDO,
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

  // Le script utilise la partie COFantasy de la variable d'état state
  // Pour plus de facilité, on utilise stateCOF = state.COFantasy
  // Attention, on ne peut utiliser ni fonction, ni cyles, ni Set.
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
  // - gameMacros : la liste des macros créées par le script
  // - eventId : compteur d'events pour avoir une id unique
  // - equipes: liste des équipes de personnages. C'est un map du nom vers:
  //   - alliance (booléen), pour savoir si les membres de l'équipe sont alliés
  //   - membres; ensemble des charid des membres de l'équipe (sous forme d'objet)
  // - numeroEquipe : un numéro pour les nouvelles équipes sans nom
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
  // - jetsEnCours : pour laisser le MJ montrer ou non un jet qui lui a été montré à lui seul
  // - currentAttackDisplay : pour pouvoir remontrer des display aux joueurs
  // - pause : le jeu est en pause
  // - afterDisplay : données à afficher après un display
  // - version : la version du script en cours, pour détecter qu'on change de version

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

  //Surveillance sur le changement d'état du token
  function statusMarkersChanged(token, prev) {
    const charId = token.get('represents');
    if (charId === undefined || charId === '') return; // Uniquement si token lié à un perso
    const perso = {
      token,
      charId
    };
    const evt = {
      type: "set_state",
    };
    let aff = affectToken(token, 'statusmarkers', prev.statusmarkers, evt);
    let currentMarkers = [];
    let markers = token.get("statusmarkers");
    if (markers !== '') {
      currentMarkers = markers.split(',');
    }
    let previousMarkers = [];
    if (prev.statusmarkers !== '') {
      previousMarkers = prev.statusmarkers.split(',');
    }
    let options = {
      affectToken: aff
    };
    // Pour tous les markers disparus
    previousMarkers.forEach(function(marker) {
      if (currentMarkers.includes(marker)) return;
      let etat = etat_de_marker[marker];
      if (etat) {
        setState(perso, etat, false, evt, options);
      } else {
        let effet = effet_de_marker[marker];
        if (effet) {
          let attr = tokenAttribute(perso, effet);
          if (attr.length === 0) return;
          finDEffet(attr[0], effet, attr[0].get('name'), perso.charId, evt);
        }
      }
    });
    // Ensuite les markers apparus
    currentMarkers.forEach(function(marker) {
      if (previousMarkers.includes(marker)) return;
      let etat = etat_de_marker[marker];
      if (etat) {
        let succes = setState(perso, etat, true, evt, options);
        if (!succes) token.set('status_' + marker, false);
      } else {
        let effet = effet_de_marker[marker];
        if (effet) { //si on a un effet de combat, on peut le lancer.
          let mEffet = messageEffetCombat[effet];
          if (mEffet) {
            setTokenAttr(perso, effet, true, evt, {
              msg: messageActivation(perso, mEffet, effet)
            });
          }
        }
      }
    });
    addEvent(evt);
  }

  function commandeSetMacros(msg, cmd, playerId, pageId, options) {
    let force = playerIsGM(playerId) && options.forceReset;
    let inBar = [];
    let allMacros = findObjs({
      _type: 'macro'
    });
    gameMacros.forEach(function(m) {
      let prev =
        allMacros.find(function(macro) {
          return macro.get('name') == m.name;
        });
      if (prev === undefined) {
        m.playerid = playerId;
        createObj('macro', m);
        sendPlayer(msg, "Macro " + m.name + " créée.", playerId);
        if (m.inBar) inBar.push(m.name);
      } else if (force) {
        prev.set('action', m.action);
        prev.set('visibleto', m.visibleto);
        prev.set('istokenaction', m.istokenaction);
        sendPlayer(msg, "Macro " + m.name + " réécrite.", playerId);
        if (m.inBar) inBar.push(m.name);
      } else {
        sendPlayer(msg, "Macro " + m.name + " déjà présente (utiliser --forceReset pour réécrire).", playerId);
      }
    });
    if (inBar.length > 0) {
      sendPlayer(msg, "Macros à mettre dans la barre d'action du MJ : " + inBar.join(', '), playerId);
    }
    stateCOF.gameMacros = gameMacros;
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
    initEquipes(characters);
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
    if (evt.equipeCreee) {
      let equipe = stateCOF.equipes[evt.equipeCreee];
      if (equipe) effacerEquipe(equipe, evt.equipeCreee);
    }
    if (evt.equipeEffacee) {
      const nom = evt.equipeEffacee.nom;
      if (stateCOF.equipes[nom]) {
        error("Impossible d'annuler l'effacement de l'équipe " + nom + ", elle a déjà été recréée.", evt.equipeEffacee.equipe);
        return;
      }
      let equipe = evt.equipeEffacee.equipe;
      stateCOF.equipes[nom] = equipe;
      //si on a une alliance, il faut tout remettre dans l'alliance
      if (equipe.alliance) allierEquipe(equipe);
    }
    if (evt.enleveCharIdEquipe) {
      const equipe = evt.enleveCharIdEquipe.equipe;
      ajouterMembre(evt.enleveCharIdEquipe.cid, equipe.membres, equipe.alliance);
    }
    if (evt.ajouterAEquipe) {
      let equipe = evt.ajouterAEquipe.equipe;
      evt.ajouterAEquipe.nouveauxMembres.forEach(function(cid) {
        delete equipe.membres[cid];
        if (equipe.alliance) recomputeAlliesParPerso(cid);
      });
    }
    if (evt.allierEquipe) {
      let equipe = evt.allierEquipe;
      if (equipe.alliance) {
        equipe.alliance = false;
        for (const cid in equipe.membres) {
          recomputeAlliesParPerso(cid);
        }
      }
    }
    if (evt.nonAllierEquipe) {
      const equipe = evt.nonAllierEquipe;
      if (!equipe.alliance) {
        equipe.alliance = true;
        allierEquipe(equipe);
      }
    }
    if (evt.renommerEquipe) {
      const nouveauNom = evt.renommerEquipe.nouveauNom;
      const ancienNom = evt.renommerEquipe.ancienNom;
      if (stateCOF.equipes[ancienNom]) {
        error("Impossible d'annuler le changement de nom : l'ancien nom a été réutilisé depuis", evt);
      } else {
        stateCOF.equipes[ancienNom] = stateCOF.equipes[nouveauNom];
        delete stateCOF.equipes[nouveauNom];
      }
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

  //Renvoie true si redo possible, false sinon
  function redoEvent(evt, action, perso) {
    let options = action.options || {};
    options.rolls = action.rolls;
    options.choices = action.choices;
    switch (evt.type) {
      case 'jetPerso':
        jetPerso(perso, action.caracteristique, action.difficulte, action.titre, action.playerId, options);
        return true;
      case 'nextTurn':
        let turnOrder = Campaign().get('turnorder');
        if (turnOrder === '') return false; // nothing in the turn order
        turnOrder = JSON.parse(turnOrder);
        if (turnOrder.length < 1) return false; // Juste le compteur de tour
        let lastTurn = turnOrder.shift();
        turnOrder.push(lastTurn);
        Campaign().set('turnorder', JSON.stringify(turnOrder));
        nextTurn(Campaign());
        return true;
      default:
        return false;
    }
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

  //TODO: revoir le montant des soins
  function soinsDuPhenix(perso, evt, expliquer) {
    let playerId;
    let playerIds = getPlayerIds(perso);
    if (playerIds.length > 0) playerId = playerIds[0];
    let display;
    if (!expliquer)
      display = startFramedDisplay(playerId, "Onde d'énergie positive", perso);
    let addMsg = function(msg) {
      if (expliquer) expliquer(msg);
      else addLineToFramedDisplay(display, msg);
    };
    let rollExpr = {
      dice: 6,
      nbDe: 3,
      bonus: modCarac(perso, 'sagesse')
    };
    let pageId = perso.token.get('pageid');
    let effet = findObjs({
      _type: 'custfx',
      name: 'phenix30'
    });
    if (effet.length === 0) {
      effet = createObj('custfx', {
        name: 'phenix30',
        definition: {
          angle: 0,
          angleRandom: 180,
          duration: 5,
          emissionRate: 2000,
          endColour: [175, 130, 50, 0],
          endColourRandom: [20, 20, 20, 0],
          lifeSpan: 30 * 6,
          lifeSpanRandom: 0,
          maxParticles: 1000,
          size: 15,
          sizeRandom: 0,
          speed: 7,
          speedRandom: 0,
          startColour: [175, 130, 25, 1],
          startColourRandom: [20, 10, 7, 0.25]
        }
      });
    } else effet = effet[0];
    effet = findObjs({
      _type: 'custfx',
      name: 'phenixInitial'
    });
    if (effet.length === 0) {
      effet = createObj('custfx', {
        name: 'phenixInitial',
        definition: {
          angle: 0,
          angleRandom: 180,
          duration: 10,
          emissionRate: 15,
          endColour: [175, 130, 50, 0],
          endColourRandom: [20, 20, 20, 0],
          lifeSpan: 10,
          lifeSpanRandom: 3,
          maxParticles: 300,
          size: 35,
          sizeRandom: 15,
          speed: 2,
          speedRandom: 0,
          startColour: [175, 130, 25, 1],
          startColourRandom: [20, 10, 7, 0.25],
          onDeath: 'phenix30'
        }
      });
    } else effet = effet[0];
    spawnFx(perso.token.get('left'), perso.token.get('top'), effet.id, pageId);
    //Jet pour les soins du prêtre
    let r = rollDePlus(rollExpr);
    r.val *= 2;
    let printTrue = function(s) {
      let msgSoin = nomPerso(perso) + " se soigne de " + s + " PV. (Le résultat du jet était " + r.roll + ")";
      addMsg(msgSoin);
    };
    soigneToken(perso, r.val, evt, printTrue);
    let allies = alliesParPerso[perso.charId] || new Set();
    let tokens = findObjs({
      _type: 'graphic',
      _subtype: 'token',
      _pageid: pageId,
      layer: 'objects'
    });
    tokens.forEach(function(tok) {
      if (perso.token.id == tok.id) return;
      let ci = tok.get('represents');
      if (ci === '') return;
      if (!allies.has(ci)) return;
      if (distanceCombat(tok, perso.token, pageId) > 30) return;
      let cible = {
        token: tok,
        charId: ci
      };
      let soins = rollDePlus(rollExpr);
      let printTrue = function(s) {
        let msgSoin = nomPerso(cible) + " est soigné" + eForFemale(cible) + " de ";
        if (s != soins.val)
          msgSoin += s + " PV. (Le résultat du jet était " + soins.roll + ")";
        else msgSoin += soins.roll + " PV.";
        addMsg(msgSoin);
      };
      soigneToken(cible, soins.val, evt, printTrue);
    });
    if (display) sendFramedDisplay(display);
  }

  // Les attaques ------------------------------------------------------

  function tokensEnCombat() {
    let cmp = Campaign();
    let turnOrder = cmp.get('turnorder');
    if (turnOrder === '') return []; // nothing in the turn order
    turnOrder = JSON.parse(turnOrder);
    if (turnOrder.length === 0) return [];
    let tokens = [];
    turnOrder.forEach(function(a) {
      if (a.id == -1) return;
      tokens.push(a.id);
    });
    return tokens;
  }

  // renvoie la valeur du bonus si il y a un capitaine (ou commandant)
  //evt est optionnel
  function aUnCapitaine(cible, evt, pageId) {
    let charId = cible.charId;
    let attrs = findObjs({
      _type: 'attribute',
      _characterid: charId,
    });
    let attrCapitaine = attrs.find(function(a) {
      return (a.get('name') == 'capitaine');
    });
    if (attrCapitaine === undefined) return false;
    if (pageId === undefined) {
      pageId = cible.token.get('pageid');
    }
    let capitaine = persoOfIdName(attrCapitaine.get('current'), pageId);
    if (evt && capitaine === undefined) {
      evt.deletedAttributes = evt.deletedAttributes || [];
      evt.deletedAttributes.push(attrCapitaine);
      attrCapitaine.remove();
    }
    let capitaineActif = attrs.find(function(a) {
      return (a.get('name') == 'capitaineActif');
    });
    if (capitaine && isActive(capitaine)) {
      if (capitaineActif || !evt) return attrCapitaine.get('max');
      setTokenAttr(cible, 'capitaineActif', true, evt, {
        charAttr: true
      });
      iterSelected(tokensEnCombat(), function(perso) {
        if (perso.charId == charId) updateInit(perso.token, evt);
      });
      return attrCapitaine.get('max');
    }
    if (capitaineActif && evt) {
      removeCharAttr(cible.charId, 'capitaineActif', evt);
      iterSelected(tokensEnCombat(), function(perso) {
        if (perso.charId == charId) updateInit(perso.token, evt);
      });
    }
    return false;
  }

  //Remplis le message selon options, options.auto et options.bonusDM
  //Si bonusDM est absent, on prend bonus pour attaque et DM
  //met à jour options.DM si bonusDM est un nombre
  function messageAttaqueDM(effet, explications, options, bonus, bonusDM) {
    if (!bonus || (options && options.auto)) { //On n'a que des DM
      if (options.bonusDM === undefined) return;
      if (bonusDM === undefined) bonusDM = bonus;
      if (!bonusDM) return;
      let msg = effet + ' => ';
      if (typeof bonusDM == 'string') {
        msg += bonusDM + " DM";
        explications.push(msg);
        return;
      }
      if (bonusDM > 0) msg += '+';
      msg += bonusDM + " aux DM";
      explications.push(msg);
      options.bonusDM += bonusDM;
      return;
    }
    let msg = effet + ' => ';
    if (bonus > 0) msg += '+';
    msg += bonus + " en Attaque";
    if (options && options.bonusDM !== undefined) {
      if (bonusDM === undefined || bonusDM == bonus) {
        msg += " et DM";
        options.bonusDM += bonus;
      } else if (bonusDM) {
        msg += " et ";
        if (typeof bonusDM == 'string') {
          msg += bonusDM + " DM";
        } else {
          if (bonusDM > 0) msg += '+';
          msg += bonusDM + " aux DM";
          options.bonusDM += bonusDM;
        }
      }
    }
    explications.push(msg);
  }

  //Tout ce qui augmente Attaque et DM, independant des options d'attaque
  // On ne tient compte que des champs auto et bonusDM de options  
  //Renvoie le bonus d'attaque, et modifie options.bonusDM
  //N'affiche pas les effets sur les DM si options.bonusDM est undefined
  //N'affiche pas les effets sur le bonus d'attaque si options.auto
  //TODO: revoir tous ces effets
  function bonusDAttaqueEtDM(perso, explications, evt, options) {
    let attBonus = 0;
    if (attributeAsBool(perso, 'masqueDuPredateur')) {
      let bonusMasque = getIntValeurOfEffet(perso, 'masqueDuPredateur', modCarac(perso, 'sagesse'));
      let masqueIntense = attributeAsInt(perso, 'masqueDuPredateurTempeteDeManaIntense', 0);
      bonusMasque += masqueIntense;
      attBonus += bonusMasque;
      messageAttaqueDM("Masque du prédateur", explications, options, bonusMasque);
      if (masqueIntense)
        removeTokenAttr(perso, 'masqueDuPredateurTempeteDeManaIntense', evt);
    } else if (attributeAsBool(perso, 'masqueDuPredateurAmeLiee')) {
      let bonusMasque =
        getIntValeurOfEffet(perso, 'masqueDuPredateurAmeLiee', 1);
      attBonus += bonusMasque;
      messageAttaqueDM("Masque du prédateur Lié", explications, options, bonusMasque);
    }
    if (attributeAsBool(perso, 'detournerLeRegard')) {
      let bonus = getIntValeurOfEffet(perso, 'detournerLeRegard', 2);
      let msg;
      if (bonus < 5) {
        msg = "Détourne le regard";
      } else {
        msg = "Ferme les yeux";
      }
      attBonus -= bonus;
      messageAttaqueDM(msg, explications, options, -bonus);
    }
    if (predicateAsBool(perso, 'batonDesRunesMortes') && attributeAsBool(perso, 'runeMelianil')) {
      attBonus += 2;
      messageAttaqueDM("Melianil", explications, options, 2, '+1d6');
    }
    if (attributeAsBool(perso, 'formeHybride')) {
      let b = 2;
      if (predicateAsBool(perso, 'formeHybrideSuperieure')) b = 4;
      attBonus += b;
      messageAttaqueDM("Forme hybride", explications, options, b);
    }
    let bonusCapitaine = aUnCapitaine(perso, evt);
    if (bonusCapitaine) {
      attBonus += parseInt(bonusCapitaine);
      let msgCapitaine = "Un ";
      if (bonusCapitaine > 2) msgCapitaine += "commandant";
      else msgCapitaine += "capitaine";
      msgCapitaine += " donne des ordres";
      messageAttaqueDM(msgCapitaine, explications, options, bonusCapitaine);
    }
    return attBonus;
  }

  //Tout ce qui augmente Attaque et DM, qui dépend des options d'attaque
  //mais pas du défenseur.
  //Renvoie le bonus d'attaque, et modifie options.bonusDM
  //N'affiche pas les effets sur les DM si options.bonusDM est undefined
  //N'affiche pas les effets sur le bonus d'attaque si options.auto
  //TODO: revoir tous ces effets
  function bonusAttaqueEtDMA(attaquant, weaponStats, evt, explications, options) {
    let attBonus = 0;
    if (options.frappeDuVide) {
      attBonus += 2;
      messageAttaqueDM("Frappe du vide", explications, options, 2, '+1' + options.d6);
    }
    if (attributeAsBool(attaquant, 'reactionViolente')) {
      attBonus += 2;
      options.reactionViolente = true;
      messageAttaqueDM("Réaction violente", explications, options, 2, '+1' + options.d6);
    }
    if (attributeAsBool(attaquant, 'drainDeForce')) {
      attBonus -= 2;
      messageAttaqueDM("Force drainée", explications, options, -2);
    }
    let energieImpie = attributeAsInt(attaquant, 'energieImpie', 0);
    if (attributeAsBool(attaquant, 'malchance')) {
      let malchance = getIntValeurOfEffet(attaquant, 'malchance', 1);
      attBonus -= malchance;
      messageAttaqueDM("Malchance", explications, options, -malchance);
    }
    if (energieImpie) {
      attBonus += energieImpie;
      messageAttaqueDM("Énergie impie", explications, options, energieImpie);
    }
    if (options.contact) {
      if (attributeAsBool(attaquant, 'rayonAffaiblissant')) {
        let rayonAffaiblissant = getIntValeurOfEffet(attaquant, 'rayonAffaiblissant', 2);
        if (rayonAffaiblissant < 0) rayonAffaiblissant = 1;
        attBonus -= rayonAffaiblissant;
        messageAttaqueDM("Rayon affaiblissant", explications, options, -rayonAffaiblissant);
      }
      if (attributeAsBool(attaquant, 'enrage')) {
        attBonus += 5;
        options.enrage = true;
        messageAttaqueDM("Enragé", explications, options, 5, '+1' + options.d6);
      }
      if (attributeAsBool(attaquant, 'rage')) {
        attBonus += 2;
        messageAttaqueDM("Enragé", explications, options, 2);
      }
      let rageBerserk = tokenAttribute(attaquant, 'rageDuBerserk');
      if (rageBerserk.length > 0) {
        rageBerserk = rageBerserk[0].get('current');
        if (rageBerserk == 'furie') {
          let bonus = 3;
          if (predicateAsBool(attaquant, 'expertiseSpecialisee') == 'furieDuBerserk') bonus += 2;
          attBonus += bonus;
          options.rageBerserk = 2;
          messageAttaqueDM("Furie du berserk", explications, options, bonus, '+2' + options.d6);
        } else {
          let bonus = 2;
          if (predicateAsBool(attaquant, 'expertiseSpecialisee') == 'rageDuBerserk') bonus += 2;
          attBonus += bonus;
          options.rageBerserk = 1;
          messageAttaqueDM("Rage du berserk", explications, options, bonus, '+1' + options.d6);
        }
      } else if (attributeAsBool(attaquant, 'frenesieMinotaure')) {
        attBonus += 2;
        options.rageBerserk = 1;
        messageAttaqueDM("Frénésie", explications, options, 2, '+1' + options.d6);
      }
      if (predicateAsBool(attaquant, 'ambidextreDuelliste')) {
        if (attaquant.armesEnMain === undefined) armesEnMain(attaquant);
        if (attaquant.armeGauche && attaquant.armeGauche.portee === 0) {
          let dmArmeGauche = modCarac(attaquant, 'dexterite');
          let bonusArmeGauche = 0;
          if (attaquant.armeGauche.bonusDef) {
            if (attaquant.pnj) {
              bonusArmeGauche = attaquant.armeGauche.attSkill;
            } else {
              bonusArmeGauche = attaquant.armeGauche.attSkillDiv;
            }
            dmArmeGauche += attaquant.armeGauche.attDMBonusCommun;
          }
          let typeDMGauche = 'normal';
          switch (attaquant.armeGauche.typeDegats) {
            case 'feu':
            case 'froid':
            case 'acide':
            case 'electrique':
            case 'sonique':
            case 'poison':
            case 'maladie':
            case 'magique':
            case 'drain':
            case 'energie':
              typeDMGauche = attaquant.armeGauche.typeDegats;
          }
          if (typeDMGauche == 'normal' && attaquant.armeGauche.modificateurs &&
            attaquant.armeGauche.modificateurs.includes('magique')) {
            typeDMGauche = 'magique';
          }
          attaquant.additionalDmg = attaquant.additionalDmg || [];
          attaquant.additionalDmg.push({
            type: typeDMGauche,
            value: dmArmeGauche
          });
          attBonus += bonusArmeGauche;
          messageAttaqueDM("Attaque ambidextre", explications, options, bonusArmeGauche, dmArmeGauche);
        }
      }
      if (options.attaqueFlamboyante) {
        let bonus = modCarac(attaquant, 'charisme');
        options.attaqueFlamboyanteBonus = bonus;
        attBonus += bonus;
        messageAttaqueDM("Attaque flamboyante", explications, options, bonus);
      }
      if (options.frappeDesArcanes) {
        attBonus += 5;
        let nbDes = options.frappeDesArcanes;
        attaquant.additionalDmg = attaquant.additionalDmg || [];
        attaquant.additionalDmg.push({
          type: options.type || 'normal',
          value: nbDes + 'd6'
        });
        messageAttaqueDM("Frappe des arcanes", explications, options, 5, '+' + nbDes + 'd6');
      }
    } //Fin de la condition options.contact
    if (stateCOF.chargeFantastique &&
      stateCOF.chargeFantastique.tokenAttaque == attaquant.token.id) {
      attBonus += 3;
      attaquant.additionalDmg = attaquant.additionalDmg || [];
      attaquant.additionalDmg.push({
        type: options.type || 'normal',
        value: '1' + options.d6
      });
      messageAttaqueDM("Charge fantastique", explications, options, 3, '+1' + options.d6);
    }
    let attrGobe = tokenAttribute(attaquant, 'estGobePar');
    if (attrGobe.length > 0) {
      let gobant =
        persoOfIdName(attrGobe[0].get('current'), attaquant.token.get('pageid'));
      if (gobant === undefined) {
        error("Attribut estGobePar mal formé", attrGobe[0].get('current'));
        attrGobe[0].remove();
        unlockToken(attaquant, evt);
      } else {
        attBonus -= 5;
        if (!options.redo) {
          options.diviseDmg = options.diviseDmg || 1;
          options.diviseDmg *= 2;
        }
        messageAttaqueDM("Attaquant dans le ventre de " + nomPerso(gobant), explications, options, -5, 'moitié');
      }
    }
    if (attributeAsBool(attaquant, 'noyade')) {
      attBonus -= 3;
      let malusDM = 0;
      if (options.bonusDM !== undefined && weaponStats && weaponStats.arme) malusDM = -3;
      messageAttaqueDM("L'attaquant se noie", explications, options, -3, malusDM);
    }
    if ((options.marteau || options.hache) && predicateAsBool(attaquant, 'hachesEtMarteaux')) {
      attBonus += 1;
      messageAttaqueDM("Haches & marteaux", explications, options, 1);
    }
    if (options.arcComposite) {
      let force = modCarac(attaquant, 'force');
      if (force > options.arcComposite) force = options.arcComposite;
      if (force >= options.arcComposite || !options.auto) {
        let msg = "Arc composite => ";
        if (force < 0) msg += force + " DM";
        else if (force > 0) msg += '+' + force + " DM";
        if (force && options.bonusDM !== undefined) {
          options.bonusDM += force;
        }
        if (force < options.arcComposite && !options.auto) {
          if (force === 0) msg += "-2 Att.";
          else if (force < 0) msg += " et -2 Att.";
          else msg += "mais -2 Att.";
          attBonus -= 2;
        }
        explications.push(msg);
      }
    }
    if (attributeAsBool(attaquant, 'fievreux')) {
      attBonus -= 2;
      messageAttaqueDM("Fiévreu" + onGenre(attaquant, 'x', 'se'), explications, options, -2);
    }
    if (options.sortilege && options.type == 'feu' && predicateAsBool(attaquant, 'boutefeu')) {
      attBonus += 2;
      attaquant.additionalDmg = attaquant.additionalDmg || [];
      attaquant.additionalDmg.push({
        type: 'feu',
        value: '1d6',
      });
      messageAttaqueDM("Boutefeu", explications, options, 2, '+1d6');
    }
    //Ce qui dépend des PV de l'attaquant
    let pv;
    let pvMax;
    if (predicateAsBool(attaquant, 'hausserLeTon')) {
      pv = parseInt(attaquant.token.get('bar1_value'));
      pvMax = parseInt(attaquant.token.get('bar1_max'));
      if (pv <= pvMax / 2) {
        attBonus += 5;
        attaquant.additionalDmg = attaquant.additionalDmg || [];
        attaquant.additionalDmg.push({
          type: options.type || 'normal',
          value: '1' + options.d6
        });
        messageAttaqueDM("Hausse le ton", explications, options, 5, '+1' + options.d6);
      }
    }
    if (predicateAsBool(attaquant, 'fureurDrakonide')) {
      if (pv === undefined) {
        pv = parseInt(attaquant.token.get('bar1_value'));
        pvMax = parseInt(attaquant.token.get('bar1_max'));
      }
      if (pv <= pvMax / 2 || attributeAsBool(attaquant, 'fureurDrakonideCritique')) {
        attBonus += 1;
        messageAttaqueDM("Fureur draconide", explications, options, 1);
      }
    }
    let armeDePredilection = predicateAsBool(attaquant, 'armeDePredilection');
    if (armeDePredilection) {
      let actif = false;
      switch (armeDePredilection) {
        case 'arc':
        case 'arbalete':
        case 'fronde':
        case 'hache':
        case 'epee':
        case 'marteau':
        case 'epieu':
        case 'poudre':
        case 'baton':
        case 'masse':
        case 'rapiere':
          actif = options[armeDePredilection];
          if (!actif && weaponStats) actif = weaponStats[armeDePredilection];
      }
      if (actif) {
        attBonus += 1;
        let bonusDM = predicateAsInt(attaquant, 'specialisationGuerrier', 0, 2);
        messageAttaqueDM("Arme de prédiléction", explications, options, 1, bonusDM);
      }
    }
    return attBonus;
  }

  // bonus d'attaque d'un token, indépendament des options
  // Mise en commun pour attack et attaque-magique
  // options pour modifier éventuellement l'affichage si pas de DM et pour mettre à jour options.bonusDM si présent
  // TODO: revoir tous ces effets
  function bonusDAttaque(personnage, explications, evt, options) {
    explications = explications || [];
    let attBonus = bonusDAttaqueEtDM(personnage, explications, evt, options);
    if (options && options.auto) return;
    //Tout ce qui suit ne peut modifier que le bonus d'attaque
    let tempAttkMod; // Utilise la barre 3 de l'attaquant
    tempAttkMod = parseInt(personnage.token.get('bar3_value'));
    if (tempAttkMod === undefined || isNaN(tempAttkMod) || tempAttkMod === "") {
      tempAttkMod = 0;
    }
    attBonus += tempAttkMod;
    let fortifie = attributeAsInt(personnage, 'fortifie', 0);
    if (fortifie > 0) {
      attBonus += 3;
      fortifie--;
      explications.push("Effet du fortifiant => +3 en Attaque. Il sera encore actif pour " + fortifie + " tests");
      if (fortifie === 0) {
        removeTokenAttr(personnage, 'fortifie', evt);
      } else {
        setTokenAttr(personnage, 'fortifie', fortifie, evt);
      }
    }
    let bac = attributeAsInt(personnage, 'actionConcertee', 0);
    if (bac > 0) {
      attBonus += bac;
      explications.push("Attaque concertée => +" + bac + " en Attaque");
    }
    if (attributeAsBool(personnage, 'chantDesHeros')) {
      let bonusChantDesHeros = getIntValeurOfEffet(personnage, 'chantDesHeros', 1);
      let chantDesHerosIntense =
        attributeAsInt(personnage, 'chantDesHerosTempeteDeManaIntense', 0);
      bonusChantDesHeros += chantDesHerosIntense;
      attBonus += bonusChantDesHeros;
      explications.push("Chant des héros => +" + bonusChantDesHeros + " en Attaque");
      if (chantDesHerosIntense)
        removeTokenAttr(personnage, 'chantDesHerosTempeteDeManaIntense', evt);
    }
    if (attributeAsBool(personnage, 'benediction')) {
      let bonusBenediction = getIntValeurOfEffet(personnage, 'benediction', 1);
      let benedictionIntense = attributeAsInt(personnage, 'benedictionTempeteDeManaIntense', 0);
      bonusBenediction += benedictionIntense;
      attBonus += bonusBenediction;
      explications.push("Bénédiction => +" + bonusBenediction + " en Attaque");
      if (benedictionIntense)
        removeTokenAttr(personnage, 'benedictionTempeteDeManaIntense', evt);
    }
    if (attributeAsBool(personnage, 'inspiration')) {
      let b = getIntValeurOfEffet(personnage, 'inspiration', 1);
      let intense = attributeAsInt(personnage, 'inspirationTempeteDeManaIntense', 0);
      b += intense;
      attBonus += b;
      explications.push("Inspiratuon => +" + b + " en Attaque");
      if (intense)
        removeTokenAttr(personnage, 'inspirationTempeteDeManaIntense', evt);
    }
    if (attributeAsBool(personnage, 'lameDeLigneePerdue')) {
      attBonus -= 1;
      explications.push("Lame de lignée perdue => -1 en Attaque");
    }
    if (attributeAsBool(personnage, 'strangulation')) {
      let malusStrangulation =
        1 + attributeAsInt(personnage, 'dureeStrangulation', 0);
      attBonus -= malusStrangulation;
      explications.push("L'attaquant est étranglé => -" + malusStrangulation + " en Attaque");
    }
    if (getState(personnage, 'renverse')) {
      attBonus -= 5;
      explications.push("Attaquant à terre => -5 en Attaque");
    }
    let attrPosture = tokenAttribute(personnage, 'postureDeCombat');
    if (attrPosture.length > 0) {
      attrPosture = attrPosture[0];
      let posture = attrPosture.get('max');
      let postureVal;
      if (posture.startsWith('ATT')) {
        postureVal = parseInt(attrPosture.get('current'));
        attBonus -= postureVal;
        explications.push("Posture de combat => -" + postureVal + " en Attaque");
      } else if (posture.endsWith('ATT')) {
        postureVal = parseInt(attrPosture.get('current'));
        attBonus += postureVal;
        explications.push("Posture de combat => +" + postureVal + " en Attaque");
      }
    }
    if (attributeAsBool(personnage, 'danseIrresistible')) {
      attBonus -= 4;
      explications.push("En train de danser => -4 en Attaque");
    }
    if (attributeAsBool(personnage, 'cadavreAnime')) {
      attBonus -= 4;
      explications.push("Cadavre animé => -2 en Attaque");
    }
    if (attributeAsBool(personnage, 'forceDeGeant')) {
      let bonusForceDeGeant = getIntValeurOfEffet(personnage, 'forceDeGeant', 2);
      attBonus += bonusForceDeGeant;
      explications.push("Force de géant => +" + bonusForceDeGeant + " en Attaque");
    }
    if (attributeAsBool(personnage, 'nueeDInsectes')) {
      let malusNuee =
        2 + attributeAsInt(personnage, 'nueeDInsectesTempeteDeManaIntense', 0);
      attBonus -= malusNuee;
      explications.push("Nuée d\'insectes => -" + malusNuee + " en Attaque");
      if (malusNuee > 2)
        removeTokenAttr(personnage, 'nueeDInsectesTempeteDeManaIntense', evt);
    }
    if (attributeAsBool(personnage, 'nueeDeCriquets')) {
      let malusNueeCriquets =
        3 + attributeAsInt(personnage, 'nueeDeCriquetsTempeteDeManaIntense', 0);
      attBonus -= malusNueeCriquets;
      explications.push("Nuée de criquets => -" + malusNueeCriquets + " en Attaque");
      if (malusNueeCriquets > 3)
        removeTokenAttr(personnage, 'nueeDeCriquetsTempeteDeManaIntense', evt);
    }
    if (attributeAsBool(personnage, 'nueeDeScorpions')) {
      attBonus -= 3;
      explications.push("Nuée de scorpions => -3 en Attaque");
    }
    if (attributeAsBool(personnage, 'etatExsangue')) {
      attBonus -= 2;
      explications.push("Exsangue => -2 en Attaque");
    }
    if (attributeAsBool(personnage, 'armeBrulante')) {
      attBonus -= 2;
      explications.push("Arme brûlante => -2 en Attaque");
    }
    if (attributeAsBool(personnage, 'prisonVegetale')) {
      attBonus -= getIntValeurOfEffet(personnage, 'prisonVegetale', 2);
      explications.push("Prison végétale : -2 en Attaque");
    }
    if (attributeAsBool(personnage, 'toiles')) {
      attBonus -= getIntValeurOfEffet(personnage, 'toiles', 2);
      explications.push("Entravé : -2 en Attaque");
    }
    if (attributeAsBool(personnage, 'armeSecreteBarde')) {
      attBonus -= 10;
      explications.push("Déstabilisé par une action de charme => -10 en Attaque");
    }
    if (attributeAsBool(personnage, 'espaceExigu')) {
      let bonusForce = modCarac(personnage, 'force');
      if (bonusForce < 1) bonusForce = 1;
      explications.push("Espace exigu : -" + bonusForce + " en Attaque");
      attBonus -= bonusForce;
    } else if (attributeAsBool(personnage, 'constructionTailleHumaine')) {
      explications.push("Construction de taille humaine : -1 en Attaque");
      attBonus -= 1;
    }
    if (attributeAsBool(personnage, 'agrippeParUnDemon')) {
      explications.push("agrippé : -3 en Attaque");
      attBonus -= 3;
    }
    if (attributeAsBool(personnage, 'ondesCorruptrices') &&
      !attributeAsBool(personnage, 'sangDeLArbreCoeur') &&
      !predicateAsBool(personnage, 'porteurDuBouclierDeGrabuge')) {
      let malus = attributeAsInt(personnage, 'ondesCorruptrices', 2);
      explications.push("nauséeux : -" + malus + " aux tests");
      attBonus -= malus;
    }
    if (attributeAsBool(personnage, 'inconfort')) {
      let inconfortValeur = attributeAsInt(personnage, 'inconfortValeur', 0);
      attBonus -= inconfortValeur;
      explications.push("Gêne due à l'armure : -" + inconfortValeur);
    }
    if (attributeAsBool(personnage, 'putrefactionOutreTombe')) {
      attBonus -= 2;
      explications.push("Putréfaction => -2 en Attaque");
    }
    if (attributeAsBool(personnage, 'secoue')) {
      attBonus -= 2;
      let msg = "Secoué" + eForFemale(personnage) + " => -2 en Attaque";
      explications.push(msg);
    }
    if (attributeAsBool(personnage, 'bonusAttaqueTemp')) {
      let bonusTemp = getIntValeurOfEffet(personnage, 'bonusAttaqueTemp', 5);
      attBonus += bonusTemp;
      explications.push("Bonus d'attaque temporaire de " + bonusTemp);
    }
    if (attributeAsBool(personnage, 'sensDuDevoir')) {
      let bonus = getIntValeurOfEffet(personnage, 'sensDuDevoir', 2);
      explications.push("Sens du devoir => +" + bonus + " en Att");
      attBonus += bonus;
    }
    if (attributeAsBool(personnage, 'tremblementMineur')) {
      explications.push("Tremblement mineur => -5 en Att");
      attBonus -= 5;
    }
    return attBonus;
  }

  function interchangeable(attackingToken, target, pageId) { //détermine si il y a assez de tokens
    let token = target.token;
    let res = {
      result: false,
      targets: []
    };
    if (!isActive(target)) return res;
    let limite = predicateAsInt(target, 'interchangeable', 0);
    if (limite < 1) return res;
    let tokens = findObjs({
      _type: 'graphic',
      _subtype: 'token',
      represents: target.charId,
      _pageid: pageId
    });
    tokens = tokens.filter(function(tok) {
      return isActive({
        token: tok
      });
    });
    res.result = (tokens.length > limite);
    // Now select the tokens which could be valid targets
    let p = distanceCombat(attackingToken, token);
    if (p === 0) { //cible au contact, on garde toutes celles au contact
      res.targets = tokens.filter(function(tok) {
        let d = distanceCombat(attackingToken, tok);
        return (d === 0);
      });
    } else { // cible à distance, on garde celles au contact de la cible
      res.targets = tokens.filter(function(tok) {
        let d = distanceCombat(token, tok);
        return (d === 0);
      });
    }
    return res;
  }

  //Bonus d'attaque qui dépendent de la cible
  //Pas appelé si options.auto
  //TODO: revoir tous ces effets
  function bonusAttaqueD(attaquant, target, portee, pageId, evt, explications, options) {
    let attBonus = 0;
    if (target.bonusAttaque) attBonus += target.bonusAttaque;
    if (getState(attaquant, 'aveugle')) {
      if (options.distance) {
        if (options.tirAveugle) {
          explications.push("Attaquant aveuglé, mais il sait tirer à l'aveugle");
        } else {
          attBonus -= 10;
          explications.push("Attaquant aveuglé => -10 en Attaque à distance");
        }
      } else {
        if (!predicateAsBool(attaquant, 'radarMental') || estNonVivant(target)) {
          attBonus -= 5;
          explications.push("Attaquant aveuglé => -5 en Attaque");
        }
      }
    } else if (attributeAsBool(attaquant, 'aveugleManoeuvre')) {
      if (options.distance || !predicateAsBool(attaquant, 'radarMental') || estNonVivant(target)) {
        attBonus -= 5;
        options.aveugleManoeuvre = true;
        if (options.pasDeDmg)
          explications.push("Attaquant aveuglé => -5 en Attaque");
        else
          explications.push("Attaquant aveuglé => -5 en Attaque et aux DM");
      }
    } else if (getState(attaquant, 'invisible') && !attributeAsBool(target, 'detectionDeLInvisible')) {
      attBonus += 5;
      explications.push("Attaque venant d'un personnage invisible => +5 en Attaque");
    } else if (options.distance && getState(attaquant, 'penombre')) {
      if (options.tirAveugle) {
        explications.push("Attaquant dans la pénombre, mais il sait tirer à l'aveugle");
      } else {
        attBonus -= 5;
        explications.push("Attaquant dans la pénombre => -5 en Attaque à distance");
      }
    }
    if (options.aoe === undefined && options.auto === undefined && portee > 0) {
      //TODO: malus à la distance.
    }
    let chasseurEmerite =
      predicateAsBool(attaquant, 'chasseurEmerite') && estAnimal(target);
    if (chasseurEmerite) {
      attBonus += 2;
      let explChasseurEmerite = "hasseur émérite => +2 en Attaque";
      if (options.displayName) {
        explChasseurEmerite = nomPerso(attaquant) + ' est un c' + explChasseurEmerite;
      } else {
        explChasseurEmerite = 'C' + explChasseurEmerite;
      }
      if (!options.pasDeDmg) explChasseurEmerite += " et aux DM";
      if (options.aoe) explChasseurEmerite += " contre " + nomPerso(target);
      explications.push(explChasseurEmerite);
      target.chasseurEmerite = true;
    }
    let racesEnnemiJure = predicatesNamed(attaquant, 'ennemiJure');
    let ennemiJure = racesEnnemiJure.some(function(rej) {
      return rej.split(',').some(function(race) {
        race = race.trim();
        if (race === '') return false;
        return persoEstDeCategorie(target, race);
      });
    });
    if (ennemiJure) {
      let ejSag = modCarac(attaquant, 'sagesse');
      attBonus += ejSag;
      let explEnnemiJure = "Attaque sur ennemi juré => +" + ejSag + " en attaque";
      if (!options.pasDeDmg) explEnnemiJure += " et +1d6 aux DM";
      if (options.aoe) explEnnemiJure += " contre " + nomPerso(target);
      explications.push(explEnnemiJure);
      target.ennemiJure = true;
    }
    if (options.armeDArgent) {
      if (estMortVivant(target) || estDemon(target)) {
        attBonus += 2;
        if (options.pasDeDmg)
          explications.push("Arme en argent => +2 en attaque");
        else
          explications.push("Arme en argent => +2 en attaque et +1d6 aux DM");
        target.armeDArgent = true;
      }
    }
    let bonusContreBouclier = options.bonusContreBouclier || 0;
    if (target.bonusContreBouclier) bonusContreBouclier += target.bonusContreBouclier;
    if (bonusContreBouclier) {
      if (ficheAttributeAsBool(target, 'defbouclieron', false)) {
        attBonus += bonusContreBouclier;
        explications.push("L'adversaire porte un bouclier => " + ((bonusContreBouclier > 0) ? '+' : '') + bonusContreBouclier + " en attaque");
      }
    }
    let bonusContreArmure = options.bonusContreArmure || 0;
    if (target.bonusContreArmure) bonusContreArmure += target.bonusContreArmure;
    if (bonusContreArmure) {
      if (ficheAttributeAsBool(target, 'defarmureon', false)) {
        attBonus += bonusContreArmure;
        explications.push("L'adversaire porte une armure => " + ((bonusContreArmure > 0) ? '+' : '') + bonusContreArmure + " en attaque");
      }
    }
    if (options.tueurDeGeants && estGeant(target)) {
      attBonus += 2;
      if (options.pasDeDmg)
        explications.push("Tueur de géant => +2 en Attaque");
      else
        explications.push("Tueur de géant => +2 att. et 2d6 DM");
      target.tueurDeGeants = true;
    }
    if (options.tueurDe) {
      options.tueurDe.forEach(function(categorie) {
        if (persoEstDeCategorie(target, categorie)) {
          let msg = "Tueur d";
          if (categorie.startsWith('i') || categorie.startsWith('h')) msg += "'";
          else msg += "e ";
          msg += categorie + " => +2 ";
          if (options.pasDeDmg)
            explications.push(msg + "en Attaque");
          else
            explications.push(msg + " att. et 2d6 DM");
          target.tueurDe = 2;
        }
      });
    }
    let attrFeinte = tokenAttribute(target, 'feinte_' + nomPerso(attaquant));
    if (attrFeinte.length > 0 && attrFeinte[0].get('current')) {
      let bonusFeinte = predicateAsInt(attaquant, 'bonusFeinte', 5);
      attBonus += bonusFeinte;
      let msgFeinte = "Feinte => +" + bonusFeinte + " en attaque";
      let niveauTouche = attrFeinte[0].get('max');
      if (niveauTouche > 0) { //La feinte avait touché cette cible
        let faireMouche = predicateAsInt(attaquant, 'faireMouche', 0);
        if (faireMouche > 0) {
          if (options.contact && !options.pasDeDmg) {
            target.faireMouche = faireMouche * niveauTouche;
            msgFeinte += " et peut faire mouche";
          }
        } else {
          let desFeinte = predicateAsInt(attaquant, 'nbDesFeinte', 2);
          desFeinte *= niveauTouche;
          target.feinte = desFeinte;
          if (!options.pasDeDmg) {
            msgFeinte += " et +" + desFeinte + options.d6;
            if (options.attaqueFlamboyanteBonus)
              msgFeinte += "+" + options.attaqueFlamboyanteBonus;
            msgFeinte += " DM";
          }
        }
      }
      explications.push(msgFeinte);
    }
    if (attributeAsBool(target, 'expose')) {
      let attrsExposeValeur = tokenAttribute(target, "exposeValeur");
      let expose = false;
      attrsExposeValeur.forEach(function testExpose(attr) {
        if (attr.get("current") == attaquant.token.id) expose = true;
      });
      if (expose) {
        attBonus += 10;
        explications.push("L'adversaire est exposé : +10");
      }
    }
    if (options.contact) {
      if ((attributeAsBool(target, 'criDeGuerre') ||
          attributeAsBool(target, 'criDuPredateur')) &&
        modCarac(attaquant, 'force') <= modCarac(target, 'force')
      ) {
        attBonus -= 2;
        explications.push("Effrayé => -2 en Attaque");
      }
    }
    let attrAgrippe = tokenAttribute(attaquant, 'agrippe');
    attrAgrippe.forEach(function(a) {
      let cibleAgrippee = persoOfIdName(a.get('current'), pageId);
      if (cibleAgrippee && cibleAgrippee.id == target.id &&
        !attributeAsBool(cibleAgrippee, 'agrippeParUnDemon')) {
        attBonus += 5;
        if (options.pasDeDmg)
          explications.push("Cible agrippée => +5 em Attaque");
        else
          explications.push("Cible agrippée => +5 att. et 1d6 DM");
        target.estAgrippee = true;
      }
    });
    if (reglesOptionelles.divers.val.interchangeable_attaque.val) {
      if (interchangeable(target.token, attaquant, pageId).result) {
        attBonus += 3;
        explications.push("Attaque en meute => +3 en Attaque et +2 en DEF");
      }
    }
    if (predicateAsBool(attaquant, 'combatEnPhalange')) {
      let tokensContact = findObjs({
        _type: 'graphic',
        _subtype: 'token',
        _pageid: pageId,
        layer: 'objects'
      });
      //On compte les tokens au contact de l'attaquant et du défenseur et alliés de l'attaquant
      let allies = alliesParPerso[attaquant.charId];
      if (allies) {
        let alliesAuContact = 0;
        tokensContact.forEach(function(tok) {
          if (tok.id == attaquant.token.id) return;
          if (distanceCombat(target.token, tok, pageId) > 0) return;
          if (distanceCombat(attaquant.token, tok, pageId) > 0) return;
          let ci = tok.get('represents');
          if (ci === '') return;
          if (!isActive({
              token: tok,
              charId: ci
            })) return;
          if (allies.has(ci)) alliesAuContact++;
        });
        if (alliesAuContact > 0) {
          attBonus += alliesAuContact;
          explications.push("Combat en phalange => +" + alliesAuContact + " en Attaque");
        }
      }
    }
    if (options.attaqueEnMeute || alliesDAttaqueEnMeute.has(attaquant.charId)) {
      let attaqueParMeute = tokenAttribute(target, 'attaqueParMeute');
      if (attaqueParMeute.length > 0) {
        attaqueParMeute = attaqueParMeute[0];
        let attaqueParMeuteCur = attaqueParMeute.get('current');
        let contientAttaquant;
        let autreAttaquant;
        attaqueParMeuteCur.split(' ').forEach(function(mi) {
          if (mi == attaquant.token.id) {
            contientAttaquant = true;
            return;
          }
          autreAttaquant = true;
        });
        if (autreAttaquant && options.attaqueEnMeute) {
          attBonus += options.attaqueEnMeute;
          explications.push("Attaque en meute => +" + options.attaqueEnMeute + " pour toucher");
        }
        if (!contientAttaquant) {
          evt.attributes = evt.attributes || [];
          evt.attributes.push({
            attribute: attaqueParMeute,
            current: attaqueParMeuteCur
          });
          if (attaqueParMeuteCur === '') attaqueParMeuteCur = attaquant.token.id;
          else attaqueParMeuteCur += ' ' + attaquant.token.id;
          attaqueParMeute.set('current', attaqueParMeuteCur);
        }
      } else {
        setTokenAttr(target, 'attaqueParMeute', attaquant.token.id, evt);
      }
    }
    if (predicateAsBool(attaquant, 'liberateurDeDorn') && estGeant(target)) {
      attBonus += 2;
      if (options.pasDeDmg) {
        explications.push("Libérateur de Dorn => +2 en attaque");
      } else {
        explications.push("Libérateur de Dorn => +2 en attaque et +2d6 DM");
        target.cibleLiberateurDeDorn = true;
      }
    }
    if (predicateAsBool(attaquant, 'tenacite')) {
      let bonus = attributeAsInt(target, 'attributDeCombat_tenaciteDe' + nomPerso(attaquant), 0);
      if (bonus > 0) {
        explications.push("Ténacité => +" + bonus + " en attaque");
        attBonus += bonus;
      }
    }
    let attrMeneurCible = tokenAttribute(target, 'meneurDHommesCible');
    if (attrMeneurCible.length > 0) {
      let meneurTokenId = attrMeneurCible[0].get('current');
      let meneurDHommes = persoOfId(meneurTokenId, meneurTokenId, pageId);
      if (meneurDHommes && alliesParPerso[meneurDHommes.charId] &&
        alliesParPerso[meneurDHommes.charId].has(attaquant.charId)) {
        attBonus += 2;
        if (!options.pasDeDmg) target.cibleMeneurDHommes = true;
        explications.push(nomPerso(meneurDHommes) + " a désigné " + nomPerso(target) +
          " comme la cible des attaques du groupe : +2 attaque, +1d6 DM");
      }
    }
    let combattreLaCorruption =
      predicateAsInt(attaquant, 'combattreLaCorruption', 0, 1);
    if (combattreLaCorruption > 0 &&
      (predicateAsBool(target, 'corrompu') ||
        estDemon(target) ||
        estMortVivant(target))) {
      attBonus += combattreLaCorruption;
      target.combattreLaCorruption = combattreLaCorruption;
      explications.push("Combattre la corruption => +" + combattreLaCorruption + " attaque et DM");
    }
    //Bonus au défi duelliste
    let defiDuellisteAttr = tokenAttribute(attaquant, 'defiDuelliste');
    if (defiDuellisteAttr.length > 0) {
      defiDuellisteAttr = defiDuellisteAttr[0];
      let cibleDefi = defiDuellisteAttr.get('max');
      if (cibleDefi.startsWith(target.token.id)) cibleDefi = true;
      else {
        let cibleDefiSep = cibleDefi.indexOf(' ');
        let cibleDefiName = cibleDefi.substring(cibleDefiSep + 1);
        if (cibleDefiName == nomPerso(target)) {
          let cibleDefiId = cibleDefi.substring(0, cibleDefiSep);
          cibleDefi = persoOfId(cibleDefiId, cibleDefiName, pageId);
          cibleDefi = cibleDefi === undefined || cibleDefi.id == target.token.id;
        } else cibleDefi = false;
      }
      if (cibleDefi) {
        let bonusDefi = parseInt(defiDuellisteAttr.get('current'));
        attBonus += bonusDefi;
        explications.push("Défi => +" + bonusDefi + " attaque");
      }
    }
    return attBonus;
  }

  //Bonus en Attaque qui ne dépendent pas du défenseur
  //Remplit le champs options.bonusDM (en partant de 0)
  //TODO: revoir les effets
  function bonusAttaqueA(attaquant, weaponStats, evt, explications, options) {
    let attBonus = 0;
    if (options.bonusAttaque) attBonus += options.bonusAttaque;
    if (options.armeMagiquePlus) attBonus += options.armeMagiquePlus;
    if (!options.pasDeDmg && !options.feinte) options.bonusDM = 0;
    attBonus += bonusDAttaque(attaquant, explications, evt, options);
    //ce qui suit dépend de options, sinon, le mettre dans bonusDAttaque
    //D'abord les options d'attaque qui n'ont de sens que si on a à la fois
    //un jet et qu'on fait des DM
    if (!options.pasDeDmg && !options.feinte) {
      if (ficheAttributeAsInt(attaquant, 'pc-tactic', 0) == 2) {
        //TODO, voir la nouvelle fiche
        options.attaqueEnPuissance = ficheAttributeAsInt(attaquant, 'attaque_en_puissance', 1);
      }
      if (!options.auto && options.attaqueEnPuissance) {
        attBonus -= 5 * options.attaqueEnPuissance;
        explications.push("Attaque en puissance => -" + (5 * options.attaqueEnPuissance) + " en Attaque et +" + options.attaqueEnPuissance + options.d6 + " DM");
      }
      if (ficheAttributeAsInt(attaquant, 'pc-tactic', 0) == 1) {
        options.attaqueAssuree = true;
      }
      if (options.attaqueAssuree) {
        attBonus += 5;
        explications.push("Attaque assurée => +5 en Attaque et DM/2");
      }
      if (ficheAttributeAsBool(attaquant, 'attaque_dm_temp_check')) {
        options.attaqueDmTemp = true;
      }
      if (options.attaqueDmTemp && !options.tempDmg && !options.sortilege && (options.contact || !options.percant)) {
        options.tempDmg = true;
        if (!options.choc) {
          attBonus -= 2;
          explications.push("Attaque pour assommer => -2 en Attaque");
        }
      }
    }
    //Puis ce qui peut affecter les DM et l'attaque
    attBonus +=
      bonusAttaqueEtDMA(attaquant, weaponStats, evt, explications, options);
    //Ensuite ce qui n'affecte que l'attaque
    if (options.tirDouble) {
      attBonus += 2;
      explications.push("Tir double => +2 Att");
    }
    if (options.chance) {
      attBonus += options.chance;
      let pc = options.chance / 10;
      explications.push(pc + " point" + ((pc > 1) ? "s" : "") + " de chance dépensé => +" + options.chance + " en Attaque");
    }
    if (options.semonce && attributeAsInt(attaquant, 'attaqueADistanceRatee', 0) == 1) {
      attBonus += 5;
    }
    if (persoEstPNJ(attaquant) && options.attaqueDeGroupe === undefined) {
      options.attaqueDeGroupe = ficheAttributeAsInt(attaquant, 'attaque_de_groupe', 1);
    }
    if (options.attaqueDeGroupe > 1) {
      let bonusTouche =
        reglesOptionelles.haute_DEF.val.bonus_attaque_groupe.val * (options.attaqueDeGroupe - 1);
      attBonus += bonusTouche;
      explications.push("Attaque en groupe => +" + bonusTouche + " en Attaque");
    }
    if (attributeAsBool(attaquant, 'criDuPredateur')) {
      attBonus += 1;
      explications.push("Cri du prédateur => +1 en attaque");
    }
    if (attributeAsBool(attaquant, 'baroudHonneurActif')) {
      attBonus += 5;
      explications.push(nomPerso(attaquant) + " porte une dernière attaque et s'effondre");
      mort(attaquant, function(m) {
        explications.push(m);
      }, evt);
      removeTokenAttr(attaquant, 'baroudHonneurActif', evt);
    }
    if (options.sortilege && attributeAsBool(attaquant, 'zoneDeSilence')) {
      attBonus -= 2;
      explications.push("Zone de silence => -2 en Attaque Magique");
    }
    if (attributeAsBool(attaquant, 'monteSur')) {
      if (!options.distance) {
        let cavalierEm = predicateAsInt(attaquant, 'cavalierEmerite');
        if (cavalierEm) {
          attBonus += cavalierEm;
          let explCavalierEmerite = "avalier émérite => +" + cavalierEm + " en Attaque";
          if (options.displayName) {
            explCavalierEmerite = nomPerso(attaquant) + " est un c" + explCavalierEmerite;
          } else {
            explCavalierEmerite = 'C' + explCavalierEmerite;
          }
          explications.push(explCavalierEmerite);
        }
      }
      if (predicateAsBool(attaquant, 'montureLoyale')) {
        attBonus += 1;
        explications.push("Monture loyale => +1 en Attaque");
      }
    }
    if (options.contact) {
      if (attributeAsBool(attaquant, 'aspectDuDemon')) {
        attBonus += getIntValeurOfEffet(attaquant, 'aspectDuDemon', 2);
        explications.push("Aspect de démon => +2 en Attaque");
      }
      if (ficheAttributeAsBool(attaquant, 'attaque_risquee_check')) {
        options.attaqueRisquee = true;
      }
      if (options.attaqueRisquee) {
        attBonus += 2;
        explications.push("Attaque risquée => +2 en Attaque");
        if (!options.test) {
          setAttrDuree(attaquant, 'attaqueRisquee', 1, evt);
        }
      }
    }
    let frenesie = predicateAsInt(attaquant, 'frenesie', 0);
    if (frenesie > 0) {
      let pv = parseInt(attaquant.token.get('bar1_value'));
      if (pv <= frenesie) {
        attBonus += 2;
        explications.push("Frénésie => +2 en Attaque");
      }
    }
    if (options.lamesJumelles) {
      let force = modCarac(attaquant, 'force');
      if (force < 2) {
        attBonus += force - 2;
        explications.push("Lames jumelles => " + (force - 2) + " en Attaque");
      }
    }
    if (attributeAsBool(attaquant, 'enerve')) {
      attBonus -= 2;
      explications.push("Attaquant énervé => -2 en Attaque");
    }
    if (attributeAsBool(attaquant, 'osBrises')) {
      attBonus -= 2;
      explications.push("Des os sont brisés => -2 en Attaque");
    }
    if (options.expertDuCombatTouche) {
      let valDesExpert = options.rolls.expertDuCombatTouche || rollDePlus(6);
      evt.action.rolls.expertDuCombatTouche = valDesExpert;
      attBonus += valDesExpert.val;
      explications.push("Expert du combat => +" + valDesExpert.roll + " en Attaque");
    }
    if (attributeAsBool(attaquant, 'danseDesLames') && malusArmure(attaquant) <= 4) {
      explications.push('Danse des lames => +2 en attaque');
      attBonus += 2;
    }
    if (attributeAsBool(attaquant, 'armesNaturelles')) {
      if (weaponStats && weaponStats.arme) {
        explications.push("Utilisation d'une arme avec ses griffes => -1 en attaque");
        attBonus -= 1;
      }
    }
    let conditions = attributeAsInt(attaquant, 'conditionsHostiles', 0, 2);
    if (conditions > 0 && (!predicateAsBool(attaquant, 'marcheSylvestre') || conditions > 4)) {
      let msgConditions = "Conditions ";
      if (conditions < 5) msgConditions += "hostiles";
      else msgConditions += "extrêmes";
      msgConditions += " : -" + conditions + " en attaque";
      explications.push(msgConditions);
      attBonus -= conditions;
    }
    return attBonus;
  }

  //L'argument weaponStats est optionnel
  //TODO: revoir, en particulier la règle qui limite les chances de crit
  function critEnAttaque(attaquant, weaponStats, options) {
    let crit = 20;
    if (weaponStats) crit = weaponStats.crit;
    if (isNaN(crit) || crit < 1 || crit > 20) {
      error("Le critique n'est pas un nombre entre 1 et 20", crit);
      crit = 20;
    }
    if (predicateAsBool(attaquant, 'scienceDuCritique') ||
      (!options.distance && !options.sortilege &&
        (predicateAsBool(attaquant, 'morsureDuSerpent') || predicateAsBool(attaquant, 'briseurDOs'))) ||
      (crit == 20 && predicateAsBool(attaquant, 'ecuyer'))) crit -= 1;
    if (options.bonusCritique) crit -= options.bonusCritique;
    if (options.affute) crit -= 1;
    if (options.contact && !weaponStats.armeGauche && predicateAsBool(attaquant, 'frappeChirurgicale'))
      crit -= modCarac(attaquant, 'intelligence');
    let armeTirFatal = predicateAsBool(attaquant, 'tirFatal');
    if (armeTirFatal) {
      if (armeTirFatal === true) armeTirFatal = 'arc';
      if (options[armeTirFatal] || weaponStats[armeTirFatal]) {
        crit -= modCarac(attaquant, 'sagesse');
        options.tirFatal = 1;
        if (predicateAsInt(attaquant, 'voieDeLArcEtDuCheval', 3) > 4)
          options.tirFatal = 2;
      }
    }
    if (options.sortilege) {
      crit -= predicateAsInt(attaquant, 'magieDeCombat', 0, 1);
      if (predicateAsBool(attaquant, 'critiqueEpiqueSorts')) crit -= 2;
    }
    if (crit < 2) crit = 2;
    return crit;
  }

  //Calcul du dé, du nombre de dé, d'un malus à l'attaque, des chances de crit
  //peut modifier options
  //TODO: revoir tous ces effets
  function computeAttackDiceOptions(attaquant, weaponStats, expliquer, evt, options = {}) {
    let crit = critEnAttaque(attaquant, weaponStats, options);
    let deMalus;
    if (!options.auto) {
      if (estAffaibli(attaquant)) {
        deMalus = true;
        expliquer("Attaquant affaibli => dé malus en Attaque");
      } else if (getState(attaquant, 'immobilise')) {
        deMalus = true;
        expliquer("Attaquant immobilisé => dé malus en Attaque");
      }
    }
    return {
      deMalus,
      crit,
    };
  }

  function addOrigin(name, toEvaluate) {
    return toEvaluate.replace(/@{/g, "@{" + name + "|");
  }

  //attaquant doit avoir un champ name
  function attackExpression(attaquant, diceOptions, weaponStats) {
    let de = computeDice(attaquant, diceOptions);
    let attackRollExpr = "[[" + de + "cs>" + diceOptions.crit + "cf1]]";
    let attSkillDiv = weaponStats.attSkillDiv;
    if (isNaN(attSkillDiv)) attSkillDiv = 0;
    let attSkillDivTxt = "";
    if (attSkillDiv > 0) attSkillDivTxt = " + " + attSkillDiv;
    else if (attSkillDiv < 0) attSkillDivTxt += attSkillDiv;
    let attackSkillExpr = addOrigin(attaquant.name, "[[" + computeArmeAtk(attaquant, weaponStats.attSkill) + attSkillDivTxt + "]]");
    return attackRollExpr + " " + attackSkillExpr;
  }

  // Interface dans le chat ---------------------------------------------

  function rollNumber(s) {
    return parseInt(s.substring(3, s.indexOf(']')));
  }

  function processRoll(roll, critRoll, failRoll, highRoll, lowRoll, noHighlight) {
    switch (roll.type) {
      case 'C':
        return {
          value: " " + roll.text + " "
        };
      case 'L':
        if (roll.text.indexOf("HR") != -1) highRoll = parseInt(roll.text.substring(2));
        else highRoll = false;
        if (roll.text.indexOf("LR") != -1) lowRoll = parseInt(roll.text.substring(2));
        else lowRoll = false;
        if (roll.text.indexOf("NH") != -1) {
          // Blocks highlight on an individual roll...
          noHighlight = true;
        }
        // Remove inline tags to reduce clutter...
        roll.text = roll.text.replace(/HR(\d+)/g, "");
        roll.text = roll.text.replace(/LR(\d+)/g, "");
        roll.text = roll.text.replace(/NH/g, "");
        if (roll.text !== "") roll.text = " [" + roll.text + "] ";
        return {
          value: roll.text,
          highRoll: highRoll,
          lowRoll: lowRoll,
          noHighlight: noHighlight
        };
      case 'M':
        roll.expr = roll.expr.toString().replace(/\+/g, " + ");
        return {
          value: roll.expr
        };
      case 'R':
        let rollValues = [];
        roll.results.forEach(function(result) {
          if (result.tableItem !== undefined) {
            rollValues.push(result.tableItem.name);
          } else {
            // Turn off highlighting if true...
            if (noHighlight) {
              critRoll = false;
              failRoll = false;
            } else {
              if (roll.mods) {
                if (roll.mods.customCrit && roll.mods.customCrit.length > 0) {
                  switch (roll.mods.customCrit[0].comp) {
                    case '=':
                    case '==':
                      critRoll = (result.v == roll.mods.customCrit[0].point);
                      break;
                    case '>=':
                    case '=>':
                    case '>':
                      critRoll = (result.v >= roll.mods.customCrit[0].point);
                      break;
                    default:
                      critRoll =
                        (highRoll !== false && result.v >= highRoll ||
                          result.v === roll.sides);
                  }
                }
                if (!critRoll && roll.mods.customFumble && roll.mods.customFumble.length > 0) {
                  switch (roll.mods.customFumble[0].comp) {
                    case '=':
                    case '==':
                      failRoll = (result.v == roll.mods.customFumble[0].point);
                      break;
                    case '<=':
                    case '=<':
                    case '<':
                      failRoll = (result.v <= roll.mods.customFumble[0].point);
                      break;
                    default:
                      failRoll =
                        (lowRoll !== false && result.v <= lowRoll || result.v === 1);
                  }
                }
              } else {
                critRoll =
                  (highRoll !== false && result.v >= highRoll ||
                    result.v === roll.sides);
                failRoll =
                  (!critRoll &&
                    (lowRoll !== false && result.v <= lowRoll || result.v === 1));
              }
            }
            let rv = "<span class='basicdiceroll" + (critRoll ? ' critsuccess' : (failRoll ? ' critfail' : '')) + "'>" + result.v + "</span>";
            rollValues.push(rv);
          }
        });
        let separator = ' + ';
        if (roll.mods && roll.mods.keep) separator = ' , ';
        return {
          value: "(" + rollValues.join(separator) + ")",
          critRoll: critRoll,
          failRoll: failRoll,
          highRoll: highRoll,
          lowRoll: lowRoll,
          noHighlight: noHighlight
        };
      case 'G':
        let grollVal = [];
        roll.rolls.forEach(function(groll) {
          groll.forEach(function(groll2) {
            let result = processRoll(groll2, highRoll, lowRoll, noHighlight);
            grollVal.push(result.value);
            critRoll = critRoll || result.critRoll;
            failRoll = failRoll || result.failRoll;
            highRoll = highRoll || result.highRoll;
            lowRoll = lowRoll || result.lowRoll;
            noHighlight = noHighlight || result.noHighlight;
          });
        });
        return {
          value: "{" + grollVal.join(" ") + "}",
          critRoll: critRoll,
          failRoll: failRoll,
          highRoll: highRoll,
          lowRoll: lowRoll,
          noHighlight: noHighlight
        };
    }
  }

  function buildinline(inlineroll, dmgType, magique) {
    let InlineColorOverride = "";
    let values = [];
    let critRoll = false;
    let failRoll = false;
    let critCheck = false;
    let failCheck = false;
    let highRoll = false;
    let lowRoll = false;
    let noHighlight = false;
    inlineroll.results.rolls.forEach(function(roll) {
      let result = processRoll(roll, critRoll, failRoll, highRoll, lowRoll, noHighlight);
      if (result.value.toString().indexOf("critsuccess") != -1) critCheck = true;
      if (result.value.toString().indexOf("critfail") != -1) failCheck = true;
      values.push(result.value);
      critRoll = result.critRoll;
      failRoll = result.failRoll;
      highRoll = result.highRoll;
      lowRoll = result.lowRoll;
      noHighlight = result.noHighlight;
    });
    // Overrides the default coloring of the inline rolls...
    let tc = dmgType;
    if (magique && (tc == 'normal' || tc == 'maladie')) tc = 'magique';
    let couleurs = couleurType[tc];
    if (couleurs) {
      InlineColorOverride = ' background-color: ' + couleurs.background + '; color: ' + couleurs.color + ';';
    } else {
      if (critCheck && failCheck) {
        InlineColorOverride = ' background-color: #8FA4D4; color: #061539;';
      } else if (critCheck && !failCheck) {
        InlineColorOverride = ' background-color: #88CC88; color: #004400;';
      } else if (!critCheck && failCheck) {
        InlineColorOverride = ' background-color: #FFAAAA; color: #660000;';
      } else {
        InlineColorOverride = ' background-color: #FFFEA2; color: #000;';
      }
    }
    let expression =
      inlineroll.expression.replace(/=>|>=/, '&amp;ge;').replace(/>/, '&amp;gt;').replace(/<=|=</, '&amp;le;').replace(/</, '&amp;lt;');
    let rollOut =
      '<span style="display: inline-block; border-radius: 5px; padding: 0 4px; ' + InlineColorOverride + '" title="' + expression + ' = ' + values.join("");
    rollOut += '" class="a inlinerollresult showtip tipsy-n';
    rollOut += (critCheck && failCheck) ? ' importantroll' : (critCheck ? ' fullcrit' : (failCheck ? ' fullfail' : ''));
    rollOut += '">' + inlineroll.results.total + '</span>';
    return rollOut;
  }

  function boutonSimple(action, texte, style) {
    action = action.replace(/%/g, '&#37;').replace(/\)/g, '&#41;').replace(/\?/g, '&#63;').replace(/@/g, '&#64;').replace(/\[/g, '&#91;').replace(/]/g, '&#93;').replace(/"/g, '&#34;').replace(/{/g, '&#123;').replace(/}/g, '&#125;').replace(/\|/g, '&#124;').replace(/\*/g, '&#42;');
    action = action.replace(/\'/g, '&apos;'); // escape quotes
    action = action.replace(/:/g, '&amp;#58;'); // double escape colon
    style = style || '';
    return '<a href="' + action + '"' + style + '>' + texte + '</a>';
  }

  function hexDec(hex_string) {
    hex_string = (hex_string + '').replace(/[^a-f0-9]/gi, '');
    return parseInt(hex_string, 16);
  }

  function getBrightness(hex) {
    hex = hex.replace('#', '');
    const c_r = hexDec(hex.substr(0, 2));
    const c_g = hexDec(hex.substr(2, 2));
    const c_b = hexDec(hex.substr(4, 2));
    return ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
  }

  //Fonction séparée pour pouvoir envoyer un frame à plusieurs joueurs
  // playerId peut être undefined (en particulier pour envoyer au mj)
  function addFramedHeader(display, playerId, chuchote) {
    let perso1 = display.perso1;
    let perso2 = display.perso2;
    let action = display.action;
    let playerBGColor = '#333';
    let playerTXColor = '#FFF';
    let displayname;
    let player;
    if (playerId) player = getObj('player', playerId);
    if (player !== undefined) {
      playerBGColor = player.get("color");
      playerTXColor = (getBrightness(playerBGColor) < 50) ? "#FFF" : "#000";
      displayname = player.get('displayname');
    }
    let res = '/direct ';
    if (chuchote) {
      let who;
      if (chuchote !== true) who = chuchote;
      else who = displayname;
      if (who) res = '/w "' + who + '" ';
      else chuchote = false;
    }
    let name1 = '',
      name2 = '';
    let avatar1, avatar2;
    if (perso2) {
      let img2;
      if (stateCOF.options.affichage.val.avatar_dans_cadres.val || !perso2.token) {
        let character2 = getObj('character', getCharId(perso2, 'avatar', optTransforme));
        if (character2) img2 = thumbImage(character2.get('avatar'));
      }
      if (!img2 && perso2.token) img2 = thumbImage(perso2.token.get('imgsrc'));
      if (img2) {
        avatar2 = '<img src="' + img2 + '" style="width: 50%; display: block; max-width: 100%; height: auto; border-radius: 6px; margin: 0 auto;">';
        name2 = '<b>' + nomPerso(perso2) + '</b>';
      }
    }
    if (perso1) {
      let img1;
      if (stateCOF.options.affichage.val.avatar_dans_cadres.val || !perso1.token) {
        let character1 = getObj('character', getCharId(perso1, 'avatar', optTransforme));
        if (character1) img1 = thumbImage(character1.get('avatar'));
      }
      if (!img1 && perso1.token) img1 = thumbImage(perso1.token.get('imgsrc'));
      if (img1) {
        avatar1 = '<img src="' + img1 + '" style="width: ' + (avatar2 ? 50 : 100) + '%; display: block; max-width: 100%; height: auto; border-radius: 6px; margin: 0 auto;">';
      }
      name1 = '<b>' + nomPerso(perso1) + '</b>';
    }
    res +=
      '<div class="all_content" style="-webkit-box-shadow: 2px 2px 5px 0px rgba(0,0,0,0.75); -moz-box-shadow: 2px 2px 5px 0px rgba(0,0,0,0.75); box-shadow: 2px 2px 5px 0px rgba(0,0,0,0.75); border: 1px solid #000; border-radius: 6px; -moz-border-radius: 6px; -webkit-border-radius: 6px; overflow: hidden; position: relative;">';
    if (display.image) {
      res +=
        '<div class="line_header" style="overflow:auto; text-align: center; vertical-align: middle; padding: 5px 5px; border-bottom: 1px solid #000; color: ' + playerTXColor + '; background-color: ' + playerBGColor + ';" title=""> ';
      res += '<img src="' + display.image + '" style="width: ' + 100 + '%; display: block; max-width: 100%; height: auto; border-radius: 6px; margin: 0 auto;">';
      res += '</div>';
    } else if (avatar1) {
      res +=
        '<div class="line_header" style="overflow:auto; text-align: center; vertical-align: middle; padding: 5px 5px; border-bottom: 1px solid #000; color: ' + playerTXColor + '; background-color: ' + playerBGColor + ';" title=""> ' +
        '<table>';
      if (avatar2) {
        res +=
          '<tr style="text-align: center">' +
          '<td style="width: 44%; vertical-align: middle;">' + name1 + '</td>' +
          '<td style="width: 12%;height: 28px;line-height: 30px;border: 2px solid #900;border-radius: 100%;position: absolute;margin-top: 25px;font-weight: bold;background-color: #EEE;color: #900;">' + 'VS' + '</td>' +
          '<td style="width: 44%; vertical-align: middle;">' + name2 + '</td>' +
          '</tr>' +
          '<tr style="text-align: center">' +
          '<td style="width: 42%; vertical-align: middle;">' + avatar1 + '</td>' +
          '<td style="width: 16%; vertical-align: middle;">&nbsp;</td>' +
          '<td style="width: 42%; vertical-align: middle;">' + avatar2 + '</td>' +
          '</tr>';
      } else {
        let bar1_info = '',
          bar2_info = '',
          bar3_info = '';
        if (chuchote && perso1.token && peutController(playerId, perso1)) {
          // on chuchote donc on peut afficher les informations concernant les barres du Token
          if (perso1.token.get('bar1_link') === '') {
            bar1_info = '<b>PV</b> : ' + perso1.token.get('bar1_value') + ' / ' + perso1.token.get('bar1_max');
          } else {
            let bar1 = getObj('attribute', perso1.token.get('bar1_link'));
            if (bar1)
              bar1_info = '<b>' + bar1.get('name') + '</b> : ' + bar1.get('current') + ' / ' + bar1.get('max') + '';
          }
          let pvTemporaires = attributeAsInt(perso1, 'PVTemporaires', 0) + attributeAsInt(perso1, 'PVTempChangementDeForme', 0);
          if (pvTemporaires > 0) bar1_info += ' (+' + pvTemporaires + ')';
          if (perso1.token.get('bar2_link') === '') {
            let dmTemp = perso1.token.get('bar2_value');
            if (dmTemp !== '') {
              dmTemp = parseInt(dmTemp);
              if (!isNaN(dmTemp) && dmTemp > 0)
                bar2_info = '<b>DM temp</b> : ' + dmTemp;
            }
          } else {
            let bar2 = findObjs({
              _type: 'attribute',
              _id: perso1.token.get('bar2_link')
            });
            if (bar2 && bar2.length > 0) bar2_info = '<b>' + bar2[0].get('name') + '</b> : ' + bar2[0].get('current') + ' / ' + bar2[0].get('max') + '';
          }
          if (perso1.token.get('bar3_link').length > 0) {
            let bar3 = findObjs({
              _type: 'attribute',
              _id: perso1.token.get('bar3_link')
            });
            if (bar3[0] !== undefined) bar3_info = '<b>' + bar3[0].get('name') + '</b> : ' + bar3[0].get('current') + ' / ' + bar3[0].get('max') + '';
          }
        }
        res +=
          '<tr style="text-align: left">' +
          '<td style="width:25%; vertical-align: middle;">' + avatar1 +
          '</td>' +
          '<td style="width:75%; vertical-align: middle; position: relative;">' +
          '<div>' + name1 + '</div>' +
          '<div style="position: absolute;top: -6px;right: -5px;border: 1px solid #000;background-color: #333;">' +
          '<div style="text-align: right; margin: 0 5px; color: #7cc489">' + bar1_info + '</div>' +
          '<div style="text-align: right; margin: 0 5px; color: #7c9bc4">' + bar2_info + '</div>' +
          '<div style="text-align: right; margin: 0 5px; color: #b21d1d">' + bar3_info + '</div>' +
          '</div>' +
          '</td>' +
          '</tr>';
      }
      res +=
        '</table>' +
        '</div>'; // line_header
    }
    // La ligne de titre
    res +=
      '<div class="line_title" style="font-size: 85%; text-align: left; vertical-align: middle; padding: 5px 5px; border-bottom: 1px solid #000; color: #a94442; background-color: #f2dede;" title=""> ';
    if (display.action_right) {
      res += '<table style="width:100%"><tr><td>' + action + '</td><td style="text-align: right;">' + display.action_right + '</td></tr></table>';
    } else {
      res += action;
    }
    res += '</div>'; // line_title
    res += '<div class="line_content">';
    display.header = res;
  }

  //Si options.chuchote est vrai, la frame est chuchotée au joueur qui fait l'action
  //Si options.chuchote est un nom, on chuchote la frame à ce nom
  //Pour retarder la décision sur la cible de chuchotement, utiliser options.retarder
  function startFramedDisplay(playerId, action, perso, options = {}) {
    if (options.secret) {
      if (playerIsGM(playerId)) {
        if (!options.chuchote) options.chuchote = true;
      } else {
        let character = getObj('character', perso.charId);
        if (character) {
          if (!options.chuchote)
            options.chuchote = '"' + character.get('name') + '"';
          let controledByGM = false;
          let charControlledby = character.get('controlledby');
          charControlledby.split(",").forEach(function(controlledby) {
            if (playerIsGM(controlledby)) controledByGM = true;
          });
          if (!controledByGM) options.retarde = true;
        } else options.retarde = true;
      }
    }
    let display = {
      output: '',
      isOdd: true,
      isfirst: true,
      perso1: perso,
      perso2: options.perso2,
      action: action,
      action_right: options.action_right,
      image: options.image,
      retarde: options.retarde
    };
    if (!options.retarde)
      addFramedHeader(display, playerId, options.chuchote);
    return display;
  }

  function addLineToFramedDisplay(display, line, size, newLine) {
    size = size || 100;
    newLine = (newLine !== undefined) ? newLine : true;
    let background_color, border = '',
      separator = '';
    if (!newLine) display.isOdd = !display.isOdd;
    if (display.isOdd) {
      background_color = "#FFF";
      display.isOdd = false;
    } else {
      background_color = "#f3f3f3";
      display.isOdd = true;
    }
    if (size < 100) background_color = "#fcf8e3";
    if (!display.isfirst) {
      if (newLine) border = "border-top: 1px solid #333;";
    } else display.isfirst = false;
    let formatedLine = '<div style="padding: 0 5px 0; background-color: ' + background_color + '; color: #000;' + border + '">';

    if (!newLine) separator = "border-top: 1px solid #ddd;";
    formatedLine += '<div style="padding: 4px 0; font-size: ' + size + '%;' + separator + '">' + line + '</div>';
    formatedLine += '</div>';
    display.output += formatedLine;
  }

  function startTableInFramedDisplay(display) {
    display.output += '<table style="width:100%">';
    display.endColumn = true;
  }

  function endTableInFramedDisplay(display) {
    if (!display.endColumn) display.output += "</tr>";
    display.output += "</table>";
  }

  //newLine indique qu'on commence une nouvelle rangée
  function addCellInFramedDisplay(display, cell, size, newLine, fond, style = '') {
    size = size || 100;
    if (display.endColumn) {
      display.output += '<tr>';
      display.endColumn = false;
    } else if (newLine) display.output += '</tr><tr>';
    let color = '#FFF';
    if (fond) color = "#d3d3d3";
    display.output += '<td style="background-color: ' + color + '; font-size: ' + size + '%; ' + style + '">' + cell + '</td>';
  }

  //Termine le cadre et l'envoie dans le chat
  function sendFramedDisplay(display) {
    if (display.header === undefined) {
      error("Pas de titre pour le cadre", display);
      return;
    }
    let res = display.header + display.output;
    res += '</div>'; // line_content
    res += '</div>'; // all_content
    sendChat('', res);
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

  function attrAsString(attr, def = '') {
    if (attr.length === 0) return def;
    return attr[0].get('current') + '';
  }

  //personnage peut ne pas avoir de token
  function attributeAsBool(personnage, name) {
    let attr = tokenAttribute(personnage, name);
    return attrAsBool(attr);
  }

  //personnage peut ne pas avoir de token
  function attributeAsString(personnage, name, def = '') {
    let attr = tokenAttribute(personnage, name);
    return attrAsString(attr, def);
  }

  //Attention à ne pas utiliser si l'attribut ne dépend pas du token
  //defPresent est optionnel
  //personnage peut ne pas avoir de token
  function attributeAsInt(personnage, name, def, defPresent) {
    let attr = tokenAttribute(personnage, name);
    return attrAsInt(attr, def, defPresent);
  }

  function charAttributeAsInt(perso, name, def, defPresent) {
    let attr = charAttribute(perso.charId, name);
    return attrAsInt(attr, def, defPresent);
  }

  function charAttributeAsBool(perso, name) {
    let attr = charAttribute(perso.charId, name);
    return attrAsBool(attr);
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

  function ficheAttributeMax(personnage, name, def, options) {
    let attr = attributesInsensitive(personnage, name, options);
    if (attr.length === 0) return def;
    return attr[0].get('max');
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

  //options peut contenir
  // msg: un message à afficher
  // maxVal: la valeur max de l'attribut
  // secret: le message n'est pas affiché pour tout le monde.
  // charAttr: si présent, on utilise un attribut de personnage
  // copy: créée une copie du l'attribut si déjà présent, ne modifie pas.
  // renvoie l'attribut créé ou mis à jour
  function setTokenAttr(personnage, attribute, value, evt, options = {}) {
    let charId = personnage.charId;
    let token = personnage.token;
    let maxval = '';
    if (options.maxVal !== undefined) maxval = options.maxVal;
    if (options.msg !== undefined) {
      sendPerso(personnage, options.msg, options.secret);
    }
    evt.attributes = evt.attributes || [];
    let fullAttribute = fullAttributeName(personnage, attribute, options);
    if (!fullAttribute) {
      let args = {
        personnage,
        attribute,
        value,
        options
      };
      let name = 'inconnu';
      if (token) name = token.get('name');
      error("Création d'un attribut undefined pour " + name, args);
      return;
    }
    let attr = [];
    if (!options.copy) {
      attr = findObjs({
        _type: 'attribute',
        _characterid: charId,
        name: fullAttribute
      });
    }
    if (attr.length === 0) {
      attr = createObj('attribute', {
        characterid: charId,
        name: fullAttribute,
        current: value,
        max: maxval
      });
      evt.attributes.push({
        attribute: attr,
      });
      return attr;
    }
    attr = attr[0];
    evt.attributes.push({
      attribute: attr,
      current: attr.get('current'),
      max: attr.get('max')
    });
    attr.set('current', value);
    if (options.maxVal !== undefined) attr.set('max', maxval);
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

  //Si evt est défini, alors on considère qu'il faut y mettre la valeur actuelle
  function updateCurrentBar(perso, barNumber, val, evt, maxVal) {
    let token = perso.token;
    let prevToken;
    let HTdeclared;
    try {
      HTdeclared = HealthColors;
    } catch (e) {
      if (e.name != "ReferenceError") throw (e);
    }
    if (HTdeclared) {
      //Pour pouvoir annuler les effets de HealthColor sur le statut
      affectToken(token, 'statusmarkers', token.get('statusmarkers'), evt);
      prevToken = JSON.parse(JSON.stringify(token));
    }
    let fieldv = 'bar' + barNumber + '_value';
    let fieldm;
    if (maxVal) fieldm = 'bar' + barNumber + '_max';
    let attrId = token.get('bar' + barNumber + '_link');
    let attr;
    if (attrId !== '') attr = getObj('attribute', attrId);
    if (attr === undefined) {
      let prevVal = token.get(fieldv);
      if (evt) affectToken(token, fieldv, prevVal, evt);
      token.set(fieldv, val);
      if (maxVal) {
        if (evt) affectToken(token, fieldm, token.get(fieldm), evt);
        token.set(fieldm, val);
      }
      if (HTdeclared) HealthColors.Update(token, prevToken);
      return;
    }
    if (evt) {
      evt.attributes = evt.attributes || [];
      evt.attributes.push({
        attribute: attr,
        current: attr.get('current'),
        max: attr.get('max'),
        withWorker: true,
      });
    }
    let aset = {
      current: val,
    };
    if (maxVal) aset.max = maxVal;
    attr.setWithWorker(aset);
    if (HTdeclared) HealthColors.Update(token, prevToken);
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

  function removeCharAttr(charId, attribute, evt, msg) {
    removeTokenAttr({
      charId: charId
    }, attribute, evt, {
      msg: msg
    });
  }

  //cherche l'attribut attribute de valeur par défaut def
  //et lui ajoute la valeur val. Crée l'attribut si besoin
  //retourne la nouvelle valeur de l'attribut
  function addToAttributeAsInt(perso, attribute, def, val, evt) {
    evt.attributes = evt.attributes || [];
    let fullAttribute = fullAttributeName(perso, attribute);
    let attr = findObjs({
      _type: 'attribute',
      _characterid: perso.charId,
      name: fullAttribute
    });
    if (attr.length === 0) {
      attr = createObj('attribute', {
        characterid: perso.charId,
        name: fullAttribute,
        current: def + val,
      });
      evt.attributes.push({
        attribute: attr,
      });
      return def + val;
    }
    attr = attr[0];
    let c = parseInt(attr.get('current'));
    evt.attributes.push({
      attribute: attr,
      current: c
    });
    if (isNaN(c)) c = def;
    c += val;
    attr.set('current', c);
    return c;
  }

  // Retourne tous les attributs dans attrs, de nom name ou commençant par name_
  function allAttributesNamed(attrs, name) {
    let reg = new RegExp("^" + name + "($|_|\\()");
    return attrs.filter(function(obj) {
      let attrName = obj.get('name');
      return reg.test(attrName);
    });
  }

  function removeAllAttributes(name, evt, attrs) {
    if (attrs === undefined) {
      attrs = findObjs({
        _type: 'attribute'
      });
    }
    let attrsNamed = allAttributesNamed(attrs, name);
    if (attrsNamed.length === 0) return attrs;
    if (evt.deletedAttributes === undefined) evt.deletedAttributes = [];
    attrsNamed.forEach(function(attr) {
      evt.deletedAttributes.push(attr);
      attr.remove();
    });
    attrs = attrs.filter(function(attr) {
      let ind = attrsNamed.findIndex(function(nattr) {
        return nattr.id == attr.id;
      });
      return (ind == -1);
    });
    return attrs;
  }

  function modOfCarac(carac) {
    switch (carac) {
      case 'force':
      case 'FORCE':
      case 'for':
      case 'FOR':
        return 'for';
      case 'agilite':
      case 'agilité':
      case 'AGILITE':
      case 'AGILITÉ':
      case 'agi':
      case 'AGI':
        return 'agi';
      case 'constitution':
      case 'CONSTITUTION':
      case 'con':
      case 'CON':
        return 'con';
      case 'intelligence':
      case 'INTELLIGENCE':
      case 'int':
      case 'INT':
        return 'int';
      case 'volonte':
      case 'volonté':
      case 'VOLONTE':
      case 'VOLONTÉ':
      case 'vol':
      case 'VOL':
        return 'vol';
      case 'charisme':
      case 'CHARISME':
      case 'cha':
      case 'CHA':
        return 'cha';
      case 'perception':
      case 'PERCEPTION':
      case 'per':
      case 'PER':
        return 'per';
      default:
        return '';
    }
  }

  //Retourne le mod de la caractéristque entière.
  //si carac n'est pas une carac, retourne 0
  //perso peut ne pas avoir de token ou être juste un charId
  //Si options est défini on utilise les caracs du perso et pas le transformé
  function modCarac(perso, carac, options) {
    if (perso.charId === undefined) perso = {
      charId: perso
    };
    let modCarac = modOfCarac(carac);
    let mod = ficheAttributeAsInt(perso, carac, 0);
    mod += predicateAsInt(perso, 'bonus_' + modCarac, 0);
    return mod;
  }

  //PNJ au sens de la fiche utilisée, pas forcément en jeu
  //perso peut ne pas avoir de token
  //options: transforme pour utliser la version transformée
  function persoEstPNJ(perso, options = {}) {
    let ptest = perso;
    if (options.transforme) {
      persoTransforme(perso);
      if (perso.transforme.charId) ptest = perso.transforme;
    }
    if (ptest.pnj) return true;
    else if (ptest.pj) return false;
    const typePerso = ficheAttribute(perso, 'sheet_type', 'pc', options);
    ptest.pnj = (typePerso == 'npc');
    ptest.pj = !perso.pnj;
    return ptest.pnj;
  }

  // retourne un tableau contenant la liste des ID de joueurs connectés controllant le personnage lié au Token
  function getPlayerIds(perso) {
    let character = getObj('character', perso.charId);
    if (character === undefined) return;
    let charControlledby = character.get('controlledby');
    if (charControlledby === '') return [];
    let playerIds = [];
    charControlledby.split(',').forEach(function(controlledby) {
      let player = getObj('player', controlledby);
      if (player === undefined) return;
      if (player.get('online')) playerIds.push(controlledby);
    });
    return playerIds;
  }

  //msg peut être un message ou un playerId
  function peutController(msg, perso) {
    if (msg === undefined) return true;
    let playerId = getPlayerIdFromMsg(msg);
    if (playerIsGM(playerId)) return true;
    if (msg.selected && msg.selected.length > 0) {
      if (perso.token.id == msg.selected[0]._id) return true;
      let selectedPerso = persoOfId(msg.selected[0]._id);
      if (selectedPerso !== undefined && selectedPerso.charId == perso.charId) return true;
    }
    let character = getObj('character', perso.charId);
    if (character === undefined) return false;
    let cb = character.get('controlledby');
    let res = cb.split(',').find(function(pid) {
      if (pid == 'all') return true;
      return (pid == playerId);
    });
    return (res !== undefined);
  }

  function estControlleParJoueur(charId) {
    let character = getObj('character', charId);
    if (character === undefined) return false;
    return character.get('controlledby').length > 0;
  }

  //Un perso est un PJ ssi le token est lié, la fiche est une fiche de PJ, et
  //elle est contrôlée par un joueur
  function estPJ(perso) {
    if (perso.token.get('bar1_link') === '') return false;
    if (persoEstPNJ(perso)) return false;
    return estControlleParJoueur(perso.charId);
  }

  // perso peut ne pas avoir de token
  function onGenre(perso, male, female) {
    let sexe = ficheAttribute(perso, 'genre', '');
    if (sexe.startsWith('F')) return female;
    return male;
  }

  function eForFemale(perso) {
    return onGenre(perso, '', 'e');
  }

  //Les attributs répétables --------------------------------------------

  function fieldAsString(obj, field, def) {
    let res = obj[field];
    if (res === undefined) return def;
    return res;
  }

  function fieldAsInt(obj, field, def) {
    let res = obj[field];
    if (res === undefined) return def;
    return toInt(res, def);
  }

  //perso peut ne pas avoir de token
  // options peut contenir transforme
  function extractRepeating(perso, repeatingSection, options) {
    const reg = new RegExp("^(repeating_" + repeatingSection + "_[^_]*_)(.*)$");
    let charId = getCharId(perso, repeatingSection, options);
    const attributes = findObjs({
      _type: 'attribute',
      _characterid: charId,
    });
    let rawList = {};
    attributes.forEach(function(a) {
      const m = reg.exec(a.get('name'));
      if (!m) return;
      rawList[m[1]] = rawList[m[1]] || {};
      rawList[m[1]][m[2]] = a.get('current');
      let max = a.get('max');
      if (max) rawList[m[1]][m[2] + '_max'] = max;
    });
    return rawList;
  }

  //perso peut ne pas avoir de token
  //renvoie la liste du perso transformé
  function listAllAttacks(perso) {
    if (perso.toutesLesAttaques) return perso.toutesLesAttaques;
    let rawList;
    if (persoEstPNJ(perso, optTransforme)) rawList = extractRepeating(perso, 'npcarmes', optTransforme);
    else rawList = extractRepeating(perso, 'armes', optTransforme);
    let liste = {}; //liste triée par label d'attaque
    for (let pref in rawList) {
      let ra = rawList[pref];
      if (ra['arme-label'] === undefined) ra['arme-label'] = 0;
      if (ra['arme-nom'] === undefined) ra['arme-nom'] = '';
      const label = ra['arme-label'];
      if (liste[label]) {
        error("Plusieurs attaques de label " + label, ra);
        continue;
      }
      ra.prefixe = pref;
      liste[label] = ra;
    }
    perso.toutesLesAttaques = liste;
    return liste;
  }

  //perso peut ne pas avoir de token
  //Pour l'instant retourne un map de prefixes
  function listAllEquipment(perso) {
    if (perso.tousLesEquipements) return perso.tousLesEquipements;
    let liste = {}; //liste triée par label d'équipement
    if (!persoEstPNJ(perso)) {
      let rawList = extractRepeating(perso, 'equipement');
      /*for (let pref in rawList) {
        let ra = rawList[pref];
        if (ra.labelarmure === undefined) ra.labelarmure = 0;
        if (liste[ra.labelarmure]) {
          error("Plusieurs armures de label " + ra.labelarmure, ra);
          continue;
        }
        ra.prefixe = pref;
        liste[ra.labelarmure] = ra;
      }*/
      liste = rawList; //Pas encore de label d'équipement sur la fiche
    }
    perso.tousLesEquipements = liste;
    return liste;
  }

  //Les prédicats ----------------------------------------------------------

  function assignPredicate(pred, name, val) {
    if (pred[name]) {
      if (!Array.isArray(pred[name])) pred[name] = [pred[name]];
      pred[name].push(val);
    } else pred[name] = val;
  }

  function predicateOfRaw(raw) {
    let pred = {};
    //On coupe d'abord par ligne
    let lignes = raw.split('\n');
    lignes.forEach(function(ligne) {
      let code = '';
      let val = '';
      let parseVal, prev, comment, inQuotes;
      for (const c of ligne) {
        if (comment) break;
        if (inQuotes) {
          switch (c) {
            case '"':
              if (prev == '\\') {
                if (parseVal) val += c;
                else code += c;
              } else {
                if (parseVal) {
                  assignPredicate(pred, code, val);
                  parseVal = false;
                  val = '';
                  code = '';
                } else if (code !== '') {
                  assignPredicate(pred, code, true);
                  val = '';
                }
                inQuotes = false;
              }
              break;
            case '\\':
              if (prev == '\\') {
                if (parseVal) val += c;
                else code += c;
              }
              break;
            default:
              if (parseVal) val += c;
              else code += c;
          }
        } else {
          switch (c) {
            case '/':
              if (prev == '/') comment = true;
              break;
            case ' ':
            case ',':
              if (parseVal) {
                if (val === '') val = true;
                assignPredicate(pred, code, val);
                code = '';
                val = '';
                parseVal = false;
              } else if (code !== '') {
                assignPredicate(pred, code, true);
                code = '';
              }
              break;
            case ':':
              if (code !== '') parseVal = true;
              break;
            case '"':
              if (code === '' || (parseVal && val === '')) inQuotes = true;
              else if (parseVal) val += c;
              else code += c;
              break;
            default:
              if (parseVal) val += c;
              else code += c;
          }
        }
        prev = c;
      }
      if (code !== '') {
        if (val === '') val = true;
        assignPredicate(pred, code, val);
      }
    });
    return pred;
  }

  function joinPredicates(predicates) {
    let pred = {};
    for (const cat in predicates) {
      for (const p in predicates[cat]) {
        if (pred[p] === undefined) {
          pred[p] = predicates[cat][p];
        } else {
          switch (typeof(pred[p])) {
            case 'boolean':
              pred[p] |= predicates[cat][p];
              break;
            case 'number':
              pred[p] += predicates[cat][p];
              break;
            case 'string':
              pred[p] = [pred[p], predicates[cat][p]];
              break;
            case 'object':
              pred[p].push(predicates[cat][p]);
          }
        }
      }
    }
    return pred;
  }

  function getPredicates(perso) {
    if (perso.predicates === undefined) {
      let predicates = predicatsFiche[perso.charId];
      const estMook = perso.token && perso.token.get('bar1_link') === '';
      if (predicates) {
        if (estMook) {
          //Quand on gérera l'équipement, il faudra regarder ça.
          delete predicates.equipement;
          delete predicates.total;
        } else if (predicates.total) {
          perso.predicates = predicates.total;
          return perso.predicates;
        }
      } else {
        predicates = {};
      }
      //D'abord le champ prédicats
      if (!predicates.attribut) {
        let raw = ficheAttribute(perso, 'predicats_script', '');
        predicates.attribut = predicateOfRaw(raw);
      }
      //Ensuite les objets équipés
      //TODO: voir quoi faire pour les mooks.
      if (estMook) {
        predicates.equipement = {};
      } else {
        let raw = '';
        let equipement = listAllEquipment(perso);
        for (let pref in equipement) {
          let eq = equipement[pref];
          if (eq['equip-on'] == '1') {
            let r = fieldAsString(eq, 'equip-prop', '');
            if (r) raw += '\n' + r;
          }
        }
        predicates.equipement = predicateOfRaw(raw);
      }
      //On rajoute les prédicats de transformation, si transformé
      persoTransforme(perso);
      if (perso.transforme.charId) {
        let rawT = ficheAttribute(perso, 'predicats_script', '', optTransforme);
        if (rawT) predicates.transforme = predicateOfRaw(rawT);
      }
      predicates.total = joinPredicates(predicates);
      perso.predicates = predicates.total;
      if (!estMook) predicatsFiche[perso.charId] = predicates;
    }
    return perso.predicates;
  }

  function predicateAsBool(perso, name) {
    let pred = getPredicates(perso);
    let r = pred[name];
    if (r === undefined) return false;
    if (Array.isArray(r)) r = r.find(function(p) {
      return p;
    });
    return r;
  }

  function predicateAsInt(perso, name, def, defPresent) {
    let pred = getPredicates(perso);
    let r = pred[name];
    if (r === undefined) return def;
    if (defPresent !== undefined) def = defPresent;
    if (Array.isArray(r)) {
      if (r.length === 0) return def;
      r = Math.max(...r);
    }
    if (r === true) return def;
    return toInt(r, def);
  }

  //Renvoie toujours un tableau, possiblement vide
  function predicatesNamed(perso, name) {
    let pred = getPredicates(perso);
    let r = pred[name];
    if (!r) return [];
    if (Array.isArray(r)) return r;
    return [r];
  }

  function predicateOrAttributeAsBool(perso, name) {
    let p = predicateAsBool(perso, name);
    if (p) return p;
    return attributeAsBool(perso, name);
  }

  function nomLimiteCapa(capa, unite) {
    let nomLimite = 'limitePar';
    switch (unite) {
      case 'tour':
      case 'Tour':
        nomLimite += 'Tour';
        break;
      case 'combat':
      case 'Combat':
        nomLimite += 'Combat';
        break;
      case 'jour':
      case 'Jour':
        nomLimite += 'Jour';
        break;
      default:
        error("Unité d'utilisation de capacité " + capa + " non reconnue", unite);
        return;
    }
    return nomLimite + '__' + capa;
  }

  function capaciteDisponibleSachantPred(perso, capa, unite) {
    let nomLimite = nomLimiteCapa(capa, unite);
    if (nomLimite === undefined) return false;
    return attributeAsInt(perso, nomLimite, 1) > 0;
  }

  function capaciteDisponible(perso, capa, unite) {
    if (!predicateAsBool(perso, capa)) return false;
    return capaciteDisponibleSachantPred(perso, capa, unite);
  }

  //capa est le nom d'un prédicat. Si le prédicat est numérique, cela donne
  //la limite, sinon la limite est 1
  // retourne
  // - utilisations: les nombre d'utilisations restantes,
  // - nomLimite: le nom de l'attribut qui stoque l'utilisation
  // - attribut: si il y a un attribut, l'attribut en question.
  function testLimiteUtilisationsCapa(perso, capa, unite, msgPlusDispo, msgPasCapa) {
    let limite = predicateAsInt(perso, capa, 0, 1);
    if (limite === 0) {
      if (msgPasCapa) sendPerso(perso, msgPasCapa);
      return;
    }
    let nomLimite = nomLimiteCapa(capa, unite);
    if (nomLimite === undefined) return;
    let utilisations = limite;
    let attribut = tokenAttribute(perso, nomLimite);
    if (attribut.length === 0) {
      attribut = undefined;
    } else {
      attribut = attribut[0];
      utilisations = parseInt(attribut.get('current'));
      if (isNaN(utilisations)) {
        error("Resource pour " + capa + " mal formée", attribut);
        return;
      }
    }
    if (utilisations < 1) {
      if (msgPlusDispo) {
        sendPerso(perso, msgPlusDispo);
      }
      return;
    }
    return {
      utilisations,
      attribut,
      nomLimite
    };
  }

  function utiliseCapacite(perso, t, evt) {
    evt.attributes = evt.attributes || [];
    if (t.attribut) {
      evt.attributes.push({
        attribute: t.attribut,
        current: t.utilisations
      });
      t.attribut.set('current', t.utilisations - 1);
    } else {
      setTokenAttr(perso, t.nomLimite, t.utilisations - 1, evt);
    }
  }

  //Les actions du tour -----------------------------------------------------

  //options est un tableaux d'options obtenues par split(' --')
  // peut retourner une struct avec champ extraText
  function actionImpossible(perso, options, defResource, tref) {
    sendPerso(perso, "calcul d'action impossible"); //TODO
  }

  //listActions est optionnel et fait référence à une liste d'actions de la
  //  fiche.
  function turnAction(perso, playerId, listActions) {
    sendPerso(perso, "Affichage de la liste des actions du tour");
  }

  //Le mouvement des tokens -------------------------------------------------

  //cof2-centrer-sur-token tid (ou nom de token)
  function commandeCentrerSurToken(msg, cmd, playerId, pageId, options) {
    if (cmd.length < 2) {
      error("Il faut préciser un token sur lequel se centrer", cmd);
      return;
    }
    let tid = cmd[1];
    let nom = cmd.slice(1).join(' ');
    let perso = persoOfId(tid, nom, pageId);
    if (perso === undefined) {
      sendPlayer(msg, "Impossible de trouver le personnage sur lequel se centrer", playerId);
      return;
    }
    let token = perso.token;
    sendPing(token.get('left'), token.get('top'), pageId, playerId, true, playerId);
  }

  function lockToken(perso, evt) {
    let lock = perso.token.get('lockMovement');
    if (!lock) {
      affectToken(perso.token, 'lockMovement', false, evt);
      perso.token.set('lockMovement', true);
    }
  }

  //si evt est défini, on ajoute les actions à evt
  function nePlusSuivre(perso, pageId, evt, reutilise) {
    let attrSuit = tokenAttribute(perso, 'suit');
    if (attrSuit.length > 0) {
      attrSuit = attrSuit[0];
      let idSuivi = attrSuit.get('current');
      let suivi = persoOfIdName(idSuivi, pageId);
      if (evt) {
        evt.attributes = evt.attribute || [];
        evt.attributes.push({
          attribute: attrSuit,
          current: idSuivi,
          max: attrSuit.get('max')
        });
      }
      if (!reutilise) attrSuit.remove();
      if (suivi === undefined) {
        sendPerso(perso, "ne suit plus personne");
        return;
      } else {
        sendPerso(perso, "ne suit plus " + nomPerso(suivi));
        let suivantDeSuivi = tokenAttribute(suivi, 'estSuiviPar');
        if (suivantDeSuivi.length > 0) {
          suivantDeSuivi = suivantDeSuivi[0];
          let currentSuivantDeSuivi = suivantDeSuivi.get('current');
          let found;
          let csds = currentSuivantDeSuivi.split(':::').filter(function(idn) {
            if (found) return true;
            let sp = splitIdName(idn);
            if (sp === undefined) return false;
            if (sp.id == perso.token.id) {
              found = true;
              return false;
            }
            if (sp.name == perso.token.get('name')) {
              found = true;
              return false;
            }
            return true;
          });
          if (csds.length === 0) {
            if (evt) {
              evt.deletedAttributes = evt.deletedAttributes || [];
              evt.deletedAttributes.push(suivantDeSuivi);
            }
            suivantDeSuivi.remove();
          } else {
            if (evt) {
              evt.attributes.push({
                attribute: suivantDeSuivi,
                current: currentSuivantDeSuivi
              });
            }
            suivantDeSuivi.set('current', csds.join(':::'));
          }
        }
      }
      return attrSuit;
    }
  }

  function commandePause(msg, cmd, playerId, pageId, options) {
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
      return action == '!cof2-pause';
    });
    if (stateCOF.pause) {
      if (macro) macro.set('name', PLAY);
      sendChat('COF', "Jeu en pause");
    } else {
      if (macro) macro.set('name', PAUSE);
      sendChat('COF', "Fin de la pause");
    }
  }

  function commandeBouger(msg, cmd, playerId, pageId, options) {
    let {
      selected
    } = getSelected(msg, pageId, options);
    if (selected.length === 0) {
      sendPlayer(msg, "Pas de token sélectionné", playerId);
      return;
    }
    if (!playerIsGM(playerId)) {
      sendPlayer(msg, "Action réservée au MJ", playerId);
      return;
    }
    const evt = {
      type: "Décoincer",
      tokens: []
    };
    iterSelected(selected, function(perso) {
      if (attributeAsBool(perso, 'decoince')) {
        sendPlayer(msg, nomPerso(perso) + " peut déjà être déplacé", playerId);
        return;
      }
      if (!perso.token.get('lockMovement')) {
        sendPlayer(msg, nomPerso(perso) + "n'est pas bloqué", playerId);
        return;
      }
      let nom = 'decoince ' + perso.token.get('name');
      pageId = pageId || perso.token.get('pageid');
      let tokenBougeAttr = tokenAttribute(perso, 'bougeGraceA');
      if (tokenBougeAttr.length > 0) {
        tokenBougeAttr = tokenBougeAttr[0];
        let tokenBouge = getObj('graphic', tokenBougeAttr.get('current'));
        if (tokenBouge === undefined) {
          //On cherche un token de nom decoince + nom du perso
          tokenBouge = findObjs({
            _type: 'graphic',
            _pageid: pageId,
            represents: perso.charId,
            name: nom
          });
          if (tokenBouge.length > 0) {
            tokenBouge = tokenBouge[0];
            tokenBougeAttr.set('current', tokenBouge.id);
          } else {
            tokenBougeAttr.remove();
          }
        }
        if (tokenBouge) {
          if (tokenBouge.get('pageid') == pageId) {
            toFront(tokenBouge);
            return;
          }
          tokenBouge.remove();
          tokenBougeAttr.remove();
        }
      }
      let tokenFields = {
        _pageid: pageId,
        represents: perso.charId,
        layer: perso.token.get('layer'),
        left: perso.token.get('left'),
        top: perso.token.get('top'),
        rotation: perso.token.get('rotation'),
        width: perso.token.get('width'),
        height: perso.token.get('height'),
        name: nom,
        aura1_radius: 0,
        aura1_color: "#EE9911",
        showplayers_aura1: false,
        showplayers_name: false,
        showplayers_bar1: false,
        showplayers_bar2: false,
        showplayers_bar3: false,
        imgsrc: IMG_INVISIBLE,
      };
      let tokenBouge = createObj('graphic', tokenFields);
      if (!tokenBouge) {
        error("Impossible de créer de token pour décoincer " + nomPerso(perso), tokenFields);
        return;
      }
      evt.tokens.push(tokenBouge);
      toFront(tokenBouge);
      setTokenAttr(perso, 'bougeGraceA', tokenBouge.id, evt);
    });
    if (pageId) sendPlayer(msg, "Penser à supprimer le token invisible quand vous aurez terminé le déplacement", playerId);
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
        let tok_objs = tokens.filter(function(t) {
          return t.get('layer') == 'objects';
        });
        if (tok_objs.length === 0) {
          error("Ambigüité sur le choix d'un token : il y a " +
            tokens.length + " tokens nommés " + name + "(aucun dans le layer objet)", tokens);
        } else {
          tokens = tok_objs;
          if (tokens.length > 1) {
            error("Ambigüité sur le choix d'un token : il y a " +
              tokens.length + " tokens nommés " + name + " dans le layer objet", tokens);
          }
        }
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
      let st = cof_states[etat];
      if (st) {
        res = token.get(cof_states[etat]);
        if (token.get('bar1_link') === '') return res;
      }
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

  //options:
  //fromTemp si on est en train de supprimer un effet temporaire
  //affectToken si on a déjà changé le statusmarkers (on vient donc d'un changement à la main d'un marker
  function setState(personnage, etat, value, evt, options = {}) {
    let token = personnage.token;
    if (value && predicateAsBool(personnage, 'immunite_' + etat)) {
      sendPerso(personnage, 'ne peut pas être ' + stringOfEtat(etat, personnage));
      return false;
    }
    let aff = options.affectToken ||
      affectToken(token, 'statusmarkers', token.get('statusmarkers'), evt);
    if (stateCOF.combat && value && etatRendInactif(etat) &&
      (options.affectToken || isActive(personnage)) &&
      (etat != 'surpris')
    ) {
      removeFromTurnTracker(personnage, evt);
    }
    if (!options.affectToken) token.set(cof_states[etat], value);
    if (token.get('bar1_link') !== '') {
      let charId = personnage.charId;
      if (charId === '') {
        error("token " + token.get('name') + " avec une barre 1 liée mais ne représente pas de personnage", token);
        return true;
      }
      let attrEtat =
        findObjs({
          _type: 'attribute',
          _characterid: charId,
          name: etat
        });
      if (value) {
        if (attrEtat.length === 0) {
          attrEtat =
            createObj('attribute', {
              characterid: charId,
              name: etat,
              current: value
            });
          evt.attributes = evt.attributes || [];
          evt.attributes.push({
            attribute: attrEtat,
          });
        }
      } else {
        if (attrEtat.length > 0) {
          evt.deletedAttributes = evt.deletedAttributes || [];
          evt.deletedAttributes.push(attrEtat[0]);
          attrEtat[0].remove();
        }
      }
    }
    if (!value) { //On enlève le save si il y en a un
      removeTokenAttr(personnage, etat + 'Save', evt);
      removeTokenAttr(personnage, etat + 'SaveParTour', evt);
    }
    let pageId = token.get('pageid');
    if (etat == 'aveugle') {
      // On change la vision du token
      let page = getObj('page', pageId);
      let udl = page && page.get('dynamic_lighting_enabled');
      if (udl) {
        if (aff.prev.has_limit_field_of_vision === undefined)
          aff.prev.has_limit_field_of_vision = token.get('has_limit_field_of_vision');
        if (aff.prev.has_limit_field_of_night_vision === undefined)
          aff.prev.has_limit_field_of_night_vision = token.get('has_limit_field_of_night_vision');
      } else {
        if (aff.prev.light_losangle === undefined)
          aff.prev.light_losangle = token.get('light_losangle');
      }
      if (value) {
        if (udl) {
          token.set('has_limit_field_of_vision', true);
          token.set('has_limit_field_of_night_vision', true);
        } else {
          token.set('light_losangle', 0);
        }
        //Normalement, ne peut plus suivre personne ?
        //Si il peut parce qu'il touche ou tient une corde, réutiliser la macro
        //pour suivre
        nePlusSuivre(personnage, pageId, evt);
      } else {
        if (!(options.fromTemp))
          removeTokenAttr(personnage, 'aveugleTemp', evt);
        if (udl) {
          token.set('has_limit_field_of_vision', false);
          token.set('has_limit_field_of_night_vision', false);
        } else {
          token.set('light_losangle', 360);
        }
      }
    } else if (etat == 'invisible') {
      let attrInvisible = tokenAttribute(personnage, 'tokenInvisible');
      if (value) {
        if (attrInvisible.length === 0) {
          //On va créer une copie de token, mais avec une image invisible et aura visible seulement de ceux qui contrôlent le token
          let tokenFields = getTokenFields(token, pageId, personnage.charId);
          tokenFields.layer = 'objects';
          tokenFields.aura1_radius = 0;
          tokenFields.aura1_color = "#FF9900";
          tokenFields.aura1_square = false;
          tokenFields.showplayers_aura1 = false;
          tokenFields.statusmarkers = '';
          tokenFields.showplayers_name = false;
          tokenFields.showplayers_bar1 = false;
          tokenFields.showplayers_bar2 = false;
          tokenFields.showplayers_bar3 = false;
          tokenFields.imgsrc = IMG_INVISIBLE;
          let tokenInvisible = createObj('graphic', tokenFields);
          if (tokenInvisible) {
            if (tokenFields.has_bright_light_vision) {
              tokenInvisible.set('has_bright_light_vision', true);
              forceLightingRefresh(pageId);
            }
            evt.tokens = evt.tokens || [];
            evt.tokens.push(tokenInvisible);
            //On met l'ancien token dans le gmlayer, car si l'image vient du marketplace, il est impossible de le recréer depuis l'API
            setToken(token, 'layer', 'gmlayer', evt);
            setTokenAttr(personnage, 'tokenInvisible', token.id, evt, {
              maxVal: tokenInvisible.id
            });
            let combat = stateCOF.combat;
            if (stateCOF.options.affichage.val.init_dynamique.val &&
              roundMarker && combat && (
                (!stateCOF.chargeFantastique && combat.activeTokenId == token.id) ||
                (stateCOF.chargeFantastique && stateCOF.chargeFantastique.activeTokenId == token.id))) {
              setToken(roundMarker, 'layer', 'gmlayer', evt);
            }
          }
        }
      } else { //On enlève l'état invisible
        if (attrInvisible.length > 0) {
          let tokenOriginel = getObj('graphic', attrInvisible[0].get('current'));
          if (!tokenOriginel) {
            if (token.get('layer') == 'gmlayer') tokenOriginel = token;
            else {
              tokenOriginel =
                findObjs({
                  _type: 'graphic',
                  _subtype: 'token',
                  _pageid: token.get('pageid'),
                  layer: 'gmlayer',
                  represents: personnage.charId,
                  name: token.get('name')
                });
              if (tokenOriginel.length > 0) tokenOriginel = tokenOriginel[0];
              else {
                error("Impossible de retrouver le token de départ de " + token.get('name') + " quand on enlève l'état invisible", attrInvisible);
                tokenOriginel = false;
              }
            }
          }
          let tokenCourant = getObj('graphic', attrInvisible[0].get('max'));
          if (!tokenCourant) {
            if (token.get('layer') == 'objects') tokenCourant = token;
            else {
              tokenCourant =
                findObjs({
                  _type: 'graphic',
                  _subtype: 'token',
                  _pageid: token.get('pageid'),
                  layer: 'objects',
                  represents: personnage.charId,
                  name: token.get('name')
                });
              if (tokenCourant.length > 0) tokenCourant = tokenCourant[0];
              else {
                error("Impossible de retrouver le token visible de " + token.get('name') + " quand on enlève l'état invisible", attrInvisible);
                tokenCourant = false;
              }
            }
          }
          removeTokenAttr(personnage, 'tokenInvisible', evt);
          if (!options.fromTemp) {
            removeTokenAttr(personnage, 'invisibleTemp', evt);
          }
          if (tokenOriginel) {
            setToken(tokenOriginel, 'layer', 'objects', evt);
            if (tokenCourant) {
              setToken(tokenOriginel, 'left', tokenCourant.get('left'), evt);
              setToken(tokenOriginel, 'top', tokenCourant.get('top'), evt);
              setToken(tokenOriginel, 'width', tokenCourant.get('width'), evt);
              setToken(tokenOriginel, 'height', tokenCourant.get('height'), evt);
              setToken(tokenOriginel, 'rotation', tokenCourant.get('rotation'), evt);
              setToken(tokenOriginel, 'flipv', tokenCourant.get('flipv'), evt);
              setToken(tokenOriginel, 'fliph', tokenCourant.get('fliph'), evt);
              if (tokenCourant.get('bar1_link') === '') {
                setToken(tokenOriginel, 'bar1_value', tokenCourant.get('bar1_value'), evt);
              }
              setToken(tokenOriginel, 'bar2_value', tokenCourant.get('bar2_value'), evt);
              setToken(tokenOriginel, 'aura2_radius', tokenCourant.get('aura2_radius'), evt);
              setToken(tokenOriginel, 'aura2_color', tokenCourant.get('aura2_color'), evt);
              setToken(tokenOriginel, 'aura2_square', tokenCourant.get('aura2_square'), evt);
              setToken(tokenOriginel, 'showplayers_aura2', tokenCourant.get('showplayers_aura2'), evt);
              setToken(tokenOriginel, 'statusmarkers', tokenCourant.get('statusmarkers'), evt);
              setToken(tokenOriginel, 'light_angle', tokenCourant.get('light_angle'), evt);
              setToken(tokenOriginel, 'has_limit_field_of_vision', tokenCourant.get('has_limit_field_of_vision'), evt);
              setToken(tokenOriginel, 'has_limit_field_of_night_vision', tokenCourant.get('has_limit_field_of_night_vision'), evt);
            }
          }
          if (tokenCourant) deleteTokenWithUndo(tokenCourant, evt);
        }
      }
    } else if (value) {
      switch (etat) {
        case 'mort':
          {
            //On s'assure de mettre les PV de la cible à 0 (pour les insta kills sans dommages)
            if (token.get('bar1_value') > 0) updateCurrentBar(personnage, 1, 0, evt);
            nePlusSuivre(personnage, pageId, evt);
            lockToken(personnage, evt);
            if (stateCOF.combat) {
              setTokenAttr(personnage, 'a0PVDepuis', stateCOF.combat.tour, evt, {
                maxVal: stateCOF.combat.init
              });
              removeTokenAttr(personnage, 'rageDuBerserk', evt);
            }
            let persoMonte = tokenAttribute(personnage, 'estMontePar');
            if (persoMonte.length > 0) {
              const cavalier = persoOfIdName(persoMonte[0].get('current'), pageId);
              if (cavalier !== undefined) {
                removeTokenAttr(cavalier, 'monteSur', evt);
              }
              removeTokenAttr(personnage, 'estMontePar', evt);
              removeTokenAttr(personnage, 'positionSurMonture', evt);
            }
            //On libère les personnages enveloppés, si il y en a.
            let attrEnveloppe = tokenAttribute(personnage, 'enveloppe');
            attrEnveloppe.forEach(function(a) {
              let cible = persoOfIdName(a.get('current'), pageId);
              if (cible) {
                let envDM = a.get('max');
                if (envDM.startsWith('etreinte')) {
                  //On a une étreinte, on enlève donc l'état immobilisé
                  setState(cible, 'immobilise', false, evt);
                }
                evt.deletedAttributes = evt.deletedAttributes || [];
                let attrCible = tokenAttribute(cible, 'enveloppePar');
                attrCible.forEach(function(a) {
                  let cube = persoOfIdName(a.get('current', pageId));
                  if (cube === undefined) {
                    evt.deletedAttributes.push(a);
                    a.remove();
                  } else if (cube.token.id == personnage.token.id) {
                    sendPerso(cible, 'se libère de ' + cube.tokName);
                    toFront(cible.token);
                    evt.deletedAttributes.push(a);
                    a.remove();
                  }
                  unlockToken(cible, evt);
                });
              }
              evt.deletedAttributes.push(a);
              a.remove();
            });
            //Si le mort est enveloppé, il est relaché
            attrEnveloppe = tokenAttribute(personnage, 'enveloppePar');
            attrEnveloppe.forEach(function(a) {
              let cube = persoOfIdName(a.get('current'), pageId);
              if (cube) {
                let envDiff = a.get('max');
                if (envDiff.startsWith('etreinte')) {
                  //On a une étreinte, on enlève donc l'état immobilisé
                  setState(personnage, 'immobilise', false, evt);
                }
                evt.deletedAttributes = evt.deletedAttributes || [];
                let attrCube = tokenAttribute(cube, 'enveloppe');
                attrCube.forEach(function(a) {
                  let cible = persoOfIdName(a.get('current', pageId));
                  if (cible === undefined) {
                    evt.deletedAttributes.push(a);
                    a.remove();
                  } else if (cible.token.id == personnage.token.id) {
                    sendPerso(cube, 'relache ' + nomPerso(personnage));
                    evt.deletedAttributes.push(a);
                    a.remove();
                  }
                });
              }
              evt.deletedAttributes.push(a);
              a.remove();
            });
            //On libère les personnages agrippés, si il y en a.
            let attrAgrippe = tokenAttribute(personnage, 'agrippe');
            attrAgrippe.forEach(function(a) {
              let cible = persoOfIdName(a.get('current'), pageId);
              if (cible) {
                evt.deletedAttributes = evt.deletedAttributes || [];
                let attrCible = tokenAttribute(cible, 'estAgrippePar');
                attrCible.forEach(function(a) {
                  let agrippant = persoOfIdName(a.get('current', pageId));
                  if (agrippant.token.id == personnage.token.id) {
                    sendPerso(cible, 'se libère de ' + agrippant.tokName);
                    toFront(cible.token);
                    if (a.get('max')) setState(cible, 'immobilise', false, evt);
                    evt.deletedAttributes.push(a);
                    a.remove();
                  }
                });
                removeTokenAttr(cible, 'agrippeParUnDemon', evt);
              }
              evt.deletedAttributes.push(a);
              a.remove();
            });
            //On libère les personnages dévorés, si il y en a.
            let attrDevore = tokenAttribute(personnage, 'devore');
            attrDevore.forEach(function(a) {
              let cible = persoOfIdName(a.get('current'), pageId);
              if (cible) {
                evt.deletedAttributes = evt.deletedAttributes || [];
                let attrCible = tokenAttribute(cible, 'estDevorePar');
                attrCible.forEach(function(a) {
                  let agrippant = persoOfIdName(a.get('current', pageId));
                  if (agrippant.token.id == personnage.token.id) {
                    sendPerso(cible, 'se libère de ' + agrippant.tokName);
                    toFront(cible.token);
                    setState(cible, 'immobilise', false, evt);
                    evt.deletedAttributes.push(a);
                    a.remove();
                  }
                });
              }
              evt.deletedAttributes.push(a);
              a.remove();
            });
            //On libère les personnages écrasés, si il y en a.
            let attrEcrase = tokenAttribute(personnage, 'ecrase');
            attrEcrase.forEach(function(a) {
              let cible = persoOfIdName(a.get('current'), pageId);
              if (cible) {
                evt.deletedAttributes = evt.deletedAttributes || [];
                let attrCible = tokenAttribute(cible, 'estEcrasePar');
                attrCible.forEach(function(a) {
                  let agrippant = persoOfIdName(a.get('current', pageId));
                  if (agrippant.token.id == personnage.token.id) {
                    sendPerso(cible, 'se libère de ' + agrippant.tokName);
                    toFront(cible.token);
                    evt.deletedAttributes.push(a);
                    a.remove();
                  }
                });
              }
              evt.deletedAttributes.push(a);
              a.remove();
            });
            //On libère les personnages avalés, si il y en a.
            let attrGobe = tokenAttribute(personnage, 'aGobe');
            attrGobe.forEach(function(a) {
              let cible = persoOfIdName(a.get('current'), pageId);
              if (cible) {
                evt.deletedAttributes = evt.deletedAttributes || [];
                let attrCible = tokenAttribute(cible, 'estGobePar');
                attrCible.forEach(function(a) {
                  let gobant = persoOfIdName(a.get('current', pageId));
                  if (gobant.token.id == personnage.token.id) {
                    sendPerso(cible, 'peut enfin sortir du ventre de ' + gobant.tokName);
                    toFront(cible.token);
                    evt.deletedAttributes.push(a);
                    a.remove();
                    unlockToken(cible, evt);
                  }
                });
              }
              evt.deletedAttributes.push(a);
              a.remove();
            });
            //On libère les personnages sous étreinte et immolation
            let attrEtreinteImmole = tokenAttribute(personnage, 'etreinteImmole');
            attrEtreinteImmole.forEach(function(a) {
              let cible = persoOfIdName(a.get('current'), pageId);
              if (cible) {
                evt.deletedAttributes = evt.deletedAttributes || [];
                let attrCible = tokenAttribute(cible, 'etreinteImmolePar');
                attrCible.forEach(function(a) {
                  let agrippant = persoOfIdName(a.get('current', pageId));
                  if (agrippant.token.id == personnage.token.id) {
                    sendPerso(cible, 'se libère de ' + agrippant.tokName);
                    toFront(cible.token);
                    setState(cible, 'immobilise', false, evt);
                    evt.deletedAttributes.push(a);
                    a.remove();
                  }
                });
              }
              evt.deletedAttributes.push(a);
              a.remove();
            });
            //On libère les personnages sous étreinte de scorpion
            let attrEtreinteScorpion = tokenAttribute(personnage, 'etreinteScorpionSur');
            attrEtreinteScorpion.forEach(function(a) {
              let cible = persoOfIdName(a.get('current'), pageId);
              if (cible) {
                evt.deletedAttributes = evt.deletedAttributes || [];
                let attrCible = tokenAttribute(cible, 'etreinteScorpionPar');
                let attrRatee = tokenAttribute(cible, 'etreinteScorpionRatee');
                attrCible.forEach(function(a) {
                  let agrippant = persoOfIdName(a.get('current', pageId));
                  if (agrippant.token.id == personnage.token.id) {
                    sendPerso(cible, 'se libère de ' + agrippant.tokName);
                    toFront(cible.token);
                    evt.deletedAttributes.push(a);
                    a.remove();
                    attrRatee.forEach(function(attrR) {
                      evt.deletedAttributes.push(attrR);
                      attrR.remove();
                    });
                  }
                });
              }
              evt.deletedAttributes.push(a);
              a.remove();
            });
            //On termine les effets temporaires liés au personnage
            let etlAttr = tokenAttribute(personnage, 'effetsTemporairesLies');
            if (etlAttr.length > 0) {
              etlAttr = etlAttr[0];
              evt.deletedAttributes = evt.deletedAttributes || [];
              let etl = etlAttr.get('current').split(',');
              etl.forEach(function(attrId) {
                let attrEffet = getObj('attribute', attrId);
                if (attrEffet === undefined) return;
                let nomAttrEffet = attrEffet.get('name');
                let charId = attrEffet.get('characterid');
                if (estEffetTemp(nomAttrEffet)) {
                  finDEffet(attrEffet, effetTempOfAttribute(attrEffet), nomAttrEffet, charId, evt);
                } else if (estEffetCombat(nomAttrEffet)) {
                  let mc = messageFin(personnage, messageEffetCombat[effetCombatOfAttribute(attrEffet)]);
                  if (mc && mc !== '') sendChar(charId, mc, true);
                  evt.deletedAttributes.push(attrEffet);
                  attrEffet.remove();
                }
              });
              evt.deletedAttributes.push(etlAttr);
              etlAttr.remove();
            }
            //On enlève les auras
            if (stateCOF.combat &&
              (predicateAsBool(personnage, 'auraDrainDeForce') || attributeAsBool(personnage, 'aura'))
            ) {
              let auras = stateCOF.combat.auras;
              if (auras) {
                if (!evt.combat) evt.combat = {...stateCOF.combat
                };
                stateCOF.combat.auras = auras.filter(function(aura) {
                  return personnage.token.id == aura.origineId;
                });
              }
            }
            if (attributeAsBool(personnage, 'objetAnime')) {
              let attr = tokenAttribute(personnage, 'objetAnime')[0];
              let nom = attr.get('name');
              finDEffet(attr, 'objetAnime', nom, personnage.charId, evt);
            } else if (charAttributeAsBool(personnage, 'armeeConjuree')) {
              removeFromTurnTracker(personnage, evt);
              deleteTokenWithUndo(personnage.token, evt);
              sendPerso(personnage, 'disparaît');
              let armeeChar = getObj('character', personnage.charId);
              if (armeeChar) {
                evt.deletedCharacters = evt.deletedCharacters || [];
                evt.deletedCharacters.push({
                  id: personnage.charId,
                  name: armeeChar.get('name'),
                  avatar: armeeChar.get('avatar'),
                  attributes: findObjs({
                    _type: 'attributes',
                    _characterid: personnage.charId
                  }),
                  abilities: findObjs({
                    _type: 'ability',
                    _characterid: personnage.charId
                  })
                });
                armeeChar.remove();
              }
            } else if (!estNonVivant(personnage)) {
              //Cherche si certains peuvent siphoner l'âme
              let allToks =
                findObjs({
                  _type: 'graphic',
                  _pageid: pageId,
                  _subtype: 'token',
                  layer: 'objects'
                });
              //On cherche d'abord si un siphon des âmes est prioritaire
              let prioriteSiphon = [];
              allToks = allToks.filter(function(tok) {
                if (tok.id == token.id) return false;
                let p = persoOfToken(tok);
                if (p === undefined) return false;
                if (getState(p, 'mort')) return false;
                if (distanceCombat(token, tok, pageId) > 20) return false;
                if (predicateAsBool(p, 'siphonDesAmes')) {
                  prioriteSiphon.push({
                    perso: p,
                    priorite: predicateAsInt(p, 'siphonDesAmesPrioritaire', 0)
                  });
                }
                return true;
              });
              if (prioriteSiphon.length > 0) {
                let pvMax = parseInt(personnage.token.get('bar1_max'));
                if (isNaN(pvMax) || pvMax < 1) pvMax = 1;
                if (estPJ(personnage) || predicateAsBool(personnage, 'PVPartagesAvec')) {
                  let siphoneur = prioriteSiphon[0].perso;
                  let bonus = predicateAsInt(siphoneur, 'siphonDesAmes', 0);
                  let jetSiphon = "(1d6";
                  if (bonus > 0) jetSiphon += '+' + bonus;
                  jetSiphon += ")";
                  sendChat('COF', "/w GM " + personnage.token.get('name') + " est un personnage joueur, possible qu'il ne soit pas vraiment mort mais juste inconscient. S'il est vraiment mort, faire le siphon des âmes par " + siphoneur.token.get('name') + " à la main " + jetSiphon);
                } else {
                  prioriteSiphon.sort(function(a, b) {
                    return b.priorite - a.priorite;
                  });
                  let fraction = 100;
                  let fractionPriorite = fraction;
                  let priorite = prioriteSiphon[0].priorite;
                  prioriteSiphon.forEach(function(x) {
                    if (x.priorite < priorite) {
                      priorite = x.priorite;
                      fractionPriorite = fraction;
                    }
                    let p = x.perso;
                    if (fractionPriorite < 1) {
                      whisperChar(p.charId, "ne réussit pas à siphoner l'âme de " + token.get('name') + " un autre pouvoir l'a siphonée avant lui");
                      return true;
                    }
                    let bonus = predicateAsInt(p, 'siphonDesAmes', 0);
                    let nbDes = 1 + Math.floor(pvMax / 60);
                    let soin = rollDePlus(6, {
                      bonus,
                      nbDes
                    });
                    let soinTotal = soin.val;
                    //Le montant total des soins ne peut excéder les pv max du personnage qui vient de mourrir.
                    let display = true;
                    if (soinTotal > pvMax) {
                      soinTotal = pvMax;
                      display = false;
                    }
                    if (soinTotal < 1) soinTotal = 1;
                    soin.val = soinTotal;
                    soin.val = Math.ceil(soin.val * fractionPriorite / 100);
                    soigneToken(p, soin.val, evt,
                      function(s) {
                        let siphMsg = "siphone l'âme de " + token.get('name') +
                          ". " + onGenre(p, 'Il', 'Elle') + " récupère ";
                        if (s == soinTotal) {
                          if (display) siphMsg += soin.roll + " pv.";
                          else siphMsg += s + " pv (jet " + soin.roll + ").";
                          fraction = 0;
                        } else {
                          siphMsg += s + " pv (jet " + soin.roll + ").";
                          fraction -= Math.ceil(s * 100 / soinTotal);
                        }
                        pvMax -= s;
                        whisperChar(p.charId, siphMsg);
                      },
                      function() {
                        whisperChar(p.charId,
                          "est déjà au maximum de point de vie. " + onGenre(p, 'Il', 'Elle') + " laisse échapper l'âme de " + token.get('name'));
                      });
                  });
                }
              }
            }
            break;
          }
        case 'immobilise':
        case 'surpris':
        case 'etourdi':
        case 'paralyse':
        case 'apeure':
          nePlusSuivre(personnage, pageId, evt);
          lockToken(personnage, evt);
          break;
        case 'assomme':
        case 'endormi':
          nePlusSuivre(personnage, pageId, evt);
          lockToken(personnage, evt);
          if (stateCOF.combat) {
            removeTokenAttr(personnage, 'rageDuBerserk', evt);
          }
      }
    } else { //value est false
      if (etat == 'mort' && stateCOF.combat)
        removeTokenAttr(personnage, 'a0PVDepuis', evt);
      if (!options.fromTemp)
        removeTokenAttr(personnage, etat + 'Temp', evt);
    }
    if (!value) {
      unlockToken(personnage, evt);
      if (stateCOF.combat && etatRendInactif(etat) && isActive(personnage) ||
        etat == 'aveugle') updateInit(token, evt);
    }
    return true;
  }

  function getRace(perso) {
    if (perso.race !== undefined) return perso.race;
    let race = ficheAttribute(perso, 'peuple', '');
    if (race === '') race = ficheAttribute(perso, 'creature', '');
    perso.race = race.trim().toLowerCase();
    return race;
  }


  function estAnimal(perso) {
    if (predicateAsBool(perso, 'animal')) return true;
    let race = getRace(perso);
    switch (race) {
      case 'animal':
      case 'aigle':
      case 'araignee':
      case 'araignée':
      case 'basilic':
      case 'bulette':
      case 'bison':
      case 'calmar':
      case 'chauve-souris':
      case 'cheval':
      case 'chien':
      case 'crocodile':
      case 'dinosaure':
      case 'éléphant':
      case 'eléphant':
      case 'elephant':
      case 'gorille':
      case 'griffon':
      case 'hipogriffe':
      case 'hydre':
      case 'insecte':
      case 'lion':
      case 'loup':
      case 'mammouth':
      case 'manticore':
      case 'ours':
      case 'ours-hibou':
      case 'panthère':
      case 'pegase':
      case 'pégase':
      case 'pieuvre':
      case 'rhinocéros':
      case 'roc':
      case 'sanglier':
      case 'serpent':
      case 'rat':
      case 'taureau':
      case 'tigre':
      case 'wiverne':
        return true;
      default:
        return false;
    }
  }

  function estFee(perso) {
    if (predicateAsBool(perso, 'fée')) return true;
    switch (getRace(perso)) {
      case 'licorne':
      case 'farfadet':
      case 'fee':
      case 'fée':
      case 'pixie':
      case 'lutin':
        return true;
      default:
        return false;
    }
  }

  function estDemon(perso) {
    if (predicateAsBool(perso, 'démon')) return true;
    switch (getRace(perso)) {
      case 'démon':
      case 'demon':
      case 'balor':
      case 'marilith':
      case 'quasit':
      case 'succube':
        return true;
      default:
        return false;
    }
  }

  function estElementaire(t) {
    if (t === undefined) return false;
    return (t == "feu" || t == "froid" || t == "acide" || t == "electrique");
  }

  function estMortVivant(perso) {
    if (predicateAsBool(perso, 'mortVivant')) return true;
    switch (getRace(perso)) {
      case 'squelette':
      case 'zombie':
      case 'mort-vivant':
      case 'mort vivant':
      case 'momie':
      case 'goule':
      case 'vampire':
        return true;
      default:
        return false;
    }
  }

  function estNonVivant(perso) {
    return (predicateAsBool(perso, 'nonVivant') ||
      attributeAsBool(perso, 'masqueMortuaire') ||
      attributeAsBool(perso, 'masqueMortuaireAmeLiee') ||
      estMortVivant(perso));
  }

  function estGeant(perso) {
    if (predicateAsBool(perso, 'géant')) return true;
    switch (getRace(perso)) {
      case 'géant':
      case 'geant':
      case 'ogre':
      case 'troll':
      case 'ettin':
      case 'cyclope':
      case 'yai':
        return true;
      default:
        return false;
    }
  }

  //Vrai pour les insectes et araignées
  function estInsecte(perso) {
    if (predicateAsBool(perso, 'insecte')) return true;
    switch (getRace(perso)) {
      case 'ankheg':
      case 'araignée':
      case 'araignee':
      case 'insecte':
        return true;
      default:
        return false;
    }
  }

  function estDraconique(perso) {
    if (predicateAsBool(perso, 'dragon')) return true;
    switch (getRace(perso)) {
      case 'dragon':
      case 'draconide':
      case 'kobold':
        return true;
      default:
        let mots = perso.race.split(' ');
        return mots.includes('dragon');
    }
  }

  function estGobelin(perso) {
    if (predicateAsBool(perso, 'gobelin')) return true;
    switch (getRace(perso)) {
      case 'gobelin':
      case 'gobelours':
      case 'hobgobelin':
      case 'wikkawak':
        return true;
      default:
        return false;
    }
  }

  function estMauvais(perso) {
    if (predicateAsBool(perso, 'mauvais')) return true;
    if (estDemon(perso)) return true;
    switch (getRace(perso)) {
      case 'squelette':
      case 'zombie':
      case 'élémentaire':
      case 'momie':
        return true;
      default:
        return false;
    }
  }

  function raceIs(perso, race) {
    return (getRace(perso).includes(race.toLowerCase()));
  }

  function persoEstDeCategorie(perso, categorie) {
    switch (categorie) {
      case 'animal':
        return estAnimal(perso);
      case 'demon':
      case 'démon':
        return estDemon(perso);
      case 'dragon':
        return estDraconique(perso);
      case 'fee':
      case 'fée':
        return estFee(perso);
      case 'géant':
      case 'geant':
        return estGeant(perso);
      case 'gobelin':
        return estGobelin(perso);
      case 'insecte':
        return estInsecte(perso);
      case 'mauvais':
        return estMauvais(perso);
      case 'mort-vivant':
        return estMortVivant(perso);
      default:
        return raceIs(perso, categorie) || predicateAsBool(perso, categorie);
    }
  }

  function tailleNormale(perso, def) {
    if (attributeAsBool(perso, 'grandeTaille')) return 4;
    switch (ficheAttribute(perso, 'taille', '', optTransforme).trim().toLowerCase()) {
      case "minuscule":
        return 1;
      case "très petit":
      case "très petite":
      case "tres petit":
        return 2;
      case "petit":
      case "petite":
        return 3;
      case "moyen":
      case "moyenne":
      case "normal":
      case "normale":
        return 4;
      case "grand":
      case "grande":
        return 5;
      case "énorme":
      case "enorme":
        return 6;
      case "colossal":
      case "colossale":
        return 7;
      default: //On passe à la méthode suivante
    }
    if (predicateAsBool(perso, 'petiteTaille')) return 3;
    switch (getRace(perso)) {
      case 'lutin':
      case 'fee':
        return 2;
      case 'halfelin':
      case 'gobelin':
      case 'kobold':
        return 3;
      case 'humain':
      case 'elfe':
      case 'nain':
      case 'demi-elfe':
      case 'demi-orque':
      case 'orque':
      case 'gnome':
      case 'âme-forgée':
        return 4;
      case 'centaure':
      case 'demi-ogre':
      case 'ogre':
      case 'minotaure':
        return 5;
    }
    return def;
  }

  //Retourne un encodage des tailes :
  // 1 : minuscule
  // 2 : très petit
  // 3 : petit
  // 4 : moyen
  // 5 : grand
  // 6 : énorme
  // 7 : colossal
  function taillePersonnage(perso, def) {
    if (perso.taille) return perso.taille;
    let taille = tailleNormale(perso, def);
    perso.taille = taille;
    return taille;
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

  function thumbImage(image) {
    if (image) {
      return image.replace(/\/(med|max).(png|webp)/, '/thumb.$2');
    }
  }

  //Change le token de perso en nouveauToken
  function copyOldTokenToNewToken(nouveauToken, perso, evt) {
    let token = perso.token;
    setToken(nouveauToken, 'layer', 'objects', evt);
    setToken(nouveauToken, 'left', token.get('left'), evt);
    setToken(nouveauToken, 'top', token.get('top'), evt);
    //setToken(nouveauToken, 'width', token.get('width'), evt);
    //setToken(nouveauToken, 'height', token.get('height'), evt);
    setToken(nouveauToken, 'rotation', token.get('rotation'), evt);
    setToken(nouveauToken, 'bar2_value', token.get('bar2_value'), evt);
    setToken(nouveauToken, 'aura1_radius', token.get('aura1_radius'), evt);
    setToken(nouveauToken, 'aura1_color', token.get('aura1_color'), evt);
    setToken(nouveauToken, 'aura1_square', token.get('aura1_square'), evt);
    setToken(nouveauToken, 'showplayers_aura1', token.get('showplayers_aura1'), evt);
    setToken(nouveauToken, 'aura2_radius', token.get('aura2_radius'), evt);
    setToken(nouveauToken, 'aura2_color', token.get('aura2_color'), evt);
    setToken(nouveauToken, 'aura2_square', token.get('aura2_square'), evt);
    setToken(nouveauToken, 'showplayers_aura2', token.get('showplayers_aura2'), evt);
    setToken(nouveauToken, 'statusmarkers', token.get('statusmarkers'), evt);
    setToken(nouveauToken, 'light_angle', token.get('light_angle'), evt);
    setToken(nouveauToken, 'has_limit_field_of_vision', token.get('has_limit_field_of_vision'), evt);
    setToken(nouveauToken, 'has_limit_field_of_night_vision', token.get('has_limit_field_of_night_vision'), evt);
    if (stateCOF.combat) {
      replaceInTurnTracker(token.id, nouveauToken.id, evt);
    }
    let res = {
      oldTokenId: token.id,
      newTokenId: nouveauToken.id,
      newToken: nouveauToken,
    };
    deleteTokenWithUndo(token, evt);
    perso.token = nouveauToken;
    return res;
  }

  function restoreTokenOfPerso(perso, evt) {
    let tokenChange = attributeAsBool(perso, 'changementDeToken');
    if (!tokenChange) return;
    let token = perso.token;
    let tokenMJ =
      findObjs({
        _type: 'graphic',
        _subtype: 'token',
        _pageid: token.get('pageid'),
        layer: 'gmlayer',
        represents: perso.charId,
        name: token.get('name')
      });
    if (tokenMJ.length === 0) { //Il est peut-être sur une autre page
      tokenMJ =
        findObjs({
          _type: 'graphic',
          _subtype: 'token',
          layer: 'gmlayer',
          represents: perso.charId,
          name: token.get('name')
        });
    }
    removeTokenAttr(perso, 'changementDeToken', evt);
    if (tokenMJ.length === 0) {
      let character = getObj('character', perso.charId);
      character.get('_defaulttoken', function(defToken) {
        if (defToken) {
          defToken = JSON.parse(defToken);
          defToken.imgsrc = thumbImage(defToken.imgsrc);
          defToken.layer = 'objects';
          defToken.left = token.get('left');
          defToken.top = token.get('top');
          defToken.pageid = token.get('pageid');
          let newToken = createObj('graphic', defToken);
          if (newToken) {
            copyOldTokenToNewToken(newToken, perso, evt);
            return;
          }
        }
        error("Impossible de retrouver le token d'origine du personnage", perso);
      });
      return;
    }
    return copyOldTokenToNewToken(tokenMJ[0], perso, evt);
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
    selected.forEach(function(tid) {
      let token = getObj('graphic', tid);
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

  function replaceInTurnTracker(tidOld, tidNew, evt) {
    let combat = stateCOF.combat;
    if (!combat) return;
    let turnOrder = Campaign().get('turnorder');
    if (turnOrder === '') return;
    evt.turnorder = evt.turnorder || turnOrder;
    turnOrder = JSON.parse(turnOrder);
    turnOrder.forEach(function(elt) {
      if (elt.id == tidOld) elt.id = tidNew;
    });
    Campaign().set('turnorder', JSON.stringify(turnOrder));
    if (tidOld == combat.activeTokenId)
      combat.activeTokenId = tidNew;
  }

 //Le son ---------------------------------------------------------------

  function commandeJouerSon(msg, cmd, playerId, pageId, options) {
    let sonIndex = msg.content.indexOf(' ');
    if (sonIndex > 0) {
      //On joue un son
      let son = msg.content.substring(sonIndex + 1);
      playSound(son);
    } else { //On arrête tous les sons
      let AMdeclared;
      try {
        AMdeclared = Roll20AM;
      } catch (e) {
        if (e.name != "ReferenceError") throw (e);
      }
      if (AMdeclared) {
        //Avec Roll20 Audio Master
        sendChat("GM", "!roll20AM --audio,stop|");
      } else {
        let jukebox = findObjs({
          type: 'jukeboxtrack',
          playing: true
        });
        jukebox.forEach(function(track) {
          track.set('playing', false);
        });
      }
    }

  }

  //La lumière -----------------------------------------------------------

  function forceLightingRefresh(pageId) {
    let page = getObj('page', pageId);
    if (!page) return;
    page.set('force_lighting_refresh', true);
  }

  // prend en compte l'unité de mesure utilisée sur la page
  function ajouteUneLumiere(perso, nomLumiere, radius, dimRadius, evt) {
    radius = scaleDistance(perso, radius);
    if (dimRadius !== '') dimRadius = scaleDistance(perso, dimRadius);
    const ct = perso.token;
    const pageId = ct.get('pageid');
    const page = getObj('page', pageId);
    const udl = page && page.get('dynamic_lighting_enabled');
    let brightLight = radius;
    if (udl) {
      if (isNaN(brightLight) || brightLight < 0) {
        error("Lumière avec un rayon négatif", radius);
        return;
      }
    }
    let attrName = 'lumiere';
    if (ct.get('bar1_link') === '') attrName += "_" + ct.get('name');
    if (ct.get('bar1_max')) {
      let lumiereSurPerso;
      //Cas particulier où le personnage est un vrai personnage qui ne fait pas de lumière
      if (!udl && !ct.get('light_radius')) {
        lumiereSurPerso = true;
        setToken(ct, 'light_radius', radius, evt);
        if (dimRadius !== '') setToken(ct, 'light_dimradius', dimRadius, evt);
        setToken(ct, 'light_otherplayers', true, evt);
      } else if (udl && !ct.get('emits_bright_light') && !ct.get('emits_low_light')) {
        lumiereSurPerso = true;
        if (dimRadius !== '') {
          if (dimRadius < 0) dimRadius = 0;
          if (dimRadius < brightLight) {
            setToken(ct, 'emits_low_light', true, evt);
            setToken(ct, 'low_light_distance', brightLight, evt);
            brightLight = dimRadius;
          }
        }
        if (brightLight > 0) {
          setToken(ct, 'emits_bright_light', true, evt);
          setToken(ct, 'bright_light_distance', brightLight, evt);
        }
      }
      if (lumiereSurPerso) {
        let attr1 = createObj('attribute', {
          characterid: perso.charId,
          name: attrName,
          current: nomLumiere,
          max: 'surToken'
        });
        evt.attributes = [{
          attribute: attr1,
        }];
        return;
      }
    }
    let tokLumiere = createObj('graphic', {
      _pageid: pageId,
      imgsrc: "https://s3.amazonaws.com/files.d20.io/images/3233035/xHOXBXoAgOHCHs8omiFAYg/thumb.png?1393406116",
      left: ct.get('left'),
      top: ct.get('top'),
      width: 70,
      height: 70,
      layer: 'walls',
      name: nomLumiere,
    });
    if (tokLumiere === undefined) {
      error("Problème lors de la création du token de lumière", perso);
      return;
    }
    evt.tokens = [tokLumiere];
    if (udl) {
      if (dimRadius !== '') {
        if (dimRadius < 0) dimRadius = 0;
        if (dimRadius < brightLight) {
          setToken(tokLumiere, 'emits_low_light', true, evt);
          setToken(tokLumiere, 'low_light_distance', brightLight, evt);
          brightLight = dimRadius;
        }
      }
      if (brightLight > 0) {
        setToken(tokLumiere, 'emits_bright_light', true, evt);
        setToken(tokLumiere, 'bright_light_distance', brightLight, evt);
      }
    } else {
      setToken(tokLumiere, 'light_radius', radius, evt);
      setToken(tokLumiere, 'light_dimradius', dimRadius, evt);
      setToken(tokLumiere, 'light_otherplayers', true, evt);
    }
    if (ct.get('bar1_max')) { //Lumière liée à un token
      let attr = createObj('attribute', {
        characterid: perso.charId,
        name: attrName,
        current: nomLumiere,
        max: tokLumiere.id
      });
      evt.attributes = [{
        attribute: attr,
      }];
    } else { //cible temporaire, à effacer
      ct.remove();
    }
  }

  function eteindreUneLumiere(perso, pageId, al, lumName, evt) {
    if (al === undefined) {
      let attrLumiere = tokenAttribute(perso, 'lumiere');
      al = attrLumiere.find(function(a) {
        return a.get('current') == lumName;
      });
      if (al === undefined) return;
    }
    let lumId = al.get('max');
    if (lumId == 'surToken') {
      //Il faut enlever la lumière sur tous les tokens
      let allTokens = [perso.token];
      if (perso.token.get('bar1_value') !== '') {
        allTokens = findObjs({
          type: 'graphic',
          represents: perso.charId
        });
        allTokens = allTokens.filter(function(tok) {
          return tok.get('bar1_value') !== '';
        });
      }
      allTokens.forEach(function(token) {
        setToken(token, 'light_radius', '', evt);
        setToken(token, 'light_dimradius', '', evt);
        setToken(token, 'emits_bright_light', false, evt);
        setToken(token, 'emits_low_light', false, evt);
      });
      al.remove();
      return;
    }
    let lumiere = getObj('graphic', lumId);
    if (lumiere === undefined) {
      let tokensLumiere = findObjs({
        _type: 'graphic',
        layer: 'walls',
        name: lumName
      });
      if (tokensLumiere.length === 0) {
        log("Pas de token pour la lumière " + lumName);
        al.remove();
        return;
      }
      lumiere = tokensLumiere.shift();
      if (tokensLumiere.length > 0) {
        //On cherche le token le plus proche de perso
        pageId = pageId || perso.token.get('pageid');
        let d = distancePixToken(lumiere, perso.token);
        let samePage = lumiere.get('pageid') == pageId;
        tokensLumiere.forEach(function(tl) {
          if (tl.get('pageid') != pageId) return;
          if (samePage) {
            let d2 = distancePixToken(tl, perso.token);
            if (d2 < d) {
              d = d2;
              lumiere = tl;
            }
          } else {
            lumiere = tl;
          }
        });
      }
    }
    al.remove();
    if (lumiere) lumiere.remove();
  }

  function commandeEteindreLumiere(msg, cmd, playerId, pageId, options) {
    let {
      selected
    } = getSelected(msg, pageId, options);
    if (selected.length === 0) {
      sendPlayer(msg, "Pas de cible sélectionnée pour !cof2-eteindre-lumiere", playerId);
      return;
    }
    let groupe;
    if (cmd.length > 1) groupe = cmd[1];
    if (groupe && groupe.toLowerCase() == 'tout') groupe = '';
    const evt = {
      type: "Eteindre la lumière"
    };
    iterSelected(selected, function(perso) {
      pageId = pageId || perso.token.get('pageid');
      let attrLumiere = tokenAttribute(perso, 'lumiere');
      attrLumiere.forEach(function(al) {
        let lumName = al.get('current');
        if (groupe && !lumName.startsWith(groupe)) return;
        eteindreUneLumiere(perso, pageId, al, lumName, evt);
      });
    });
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

  const messageEffetIndetermine = {};

  function buildPatternEffets(listeEffets, postfix) {
    if (postfix && postfix.length === 0) postfix = undefined;
    let expression = "(";
    expression = _.reduce(listeEffets, function(reg, msg, effet) {
      let res = reg;
      if (res !== "(") res += "|";
      res += "^" + effet;
      if (msg.generic) res += "\\([^)_]*\\)";
      res += "(";
      if (postfix) {
        postfix.forEach(function(p, i) {
          if (i) res += "|";
          res += p + "$|" + p + "_";
        });
      } else res += "$|_";
      res += ")";
      return res;
    }, expression);
    expression += ")";
    return new RegExp(expression);
  }

  const patternEffetsTemp = buildPatternEffets(messageEffetTemp);

  function estEffetTemp(name) {
    return (patternEffetsTemp.test(name));
  }

  const patternAttributEffetsTemp =
    buildPatternEffets(messageEffetTemp, ['Puissant', 'Valeur', 'SaveParTour', 'SaveActifParTour', 'SaveParTourType', 'TempeteDeManaIntense', 'Options', 'TokenSide', 'Activation', 'Actif', 'Fin']);

  function estAttributEffetTemp(name) {
    return (patternAttributEffetsTemp.test(name));
  }

  const patternEffetsCombat = buildPatternEffets(messageEffetCombat);

  function estEffetCombat(name) {
    return (patternEffetsCombat.test(name));
  }

  const patternAttributEffetsCombat =
    buildPatternEffets(messageEffetCombat, ['Puissant', 'Valeur', 'SaveParTour', 'SaveActifParTour', 'SaveParTourType', 'TempeteDeManaIntense', 'Options', 'TokenSide', 'Activation', 'Actif', 'Fin']);

  function estAttributEffetCombat(name) {
    return (patternAttributEffetsCombat.test(name));
  }

  const patternEffetsIndetermine = buildPatternEffets(messageEffetIndetermine);

  function estEffetIndetermine(name) {
    return (patternEffetsIndetermine.test(name));
  }

  // perso peut ne pas avoir de token
  function messageActivation(perso, message, effetC, attrName) {
    if (!message.activation)
      return attributeWithExtensionAsString(perso, effetC, 'Activation', attrName);
    if (message.activationF) return onGenre(perso, message.activation, message.activationF);
    return message.activation;
  }

  // perso peut ne pas avoir de token
  function messageActif(perso, message, effetC, attrName) {
    if (!message.actif)
      return attributeWithExtensionAsString(perso, effetC, 'Actif', attrName);
    if (message.actifF) return onGenre(perso, message.actif, message.actifF);
    return message.actif;
  }

  // perso peut ne pas avoir de token
  function messageFin(perso, message, effetC, attrName) {
    if (!message.fin)
      return attributeWithExtensionAsString(perso, effetC, 'Fin', attrName);
    if (message.finF) return onGenre(perso, message.fin, message.finF);
    return message.fin;
  }

  //On sait déjà que le nom a passé le test estEffetTemp
  function effetTempOfAttribute(attr) {
    let ef = attr.get('name');
    if (ef === undefined || messageEffetTemp[ef]) return ef;
    //D'abord on enlève le nom du token
    let pu = ef.indexOf('_MOOK_');
    if (pu > 0) {
      ef = ef.substring(0, pu);
      if (messageEffetTemp[ef]) return ef;
    }
    //Ensuite on enlève les parties entre parenthèse pour les effets génériques
    pu = ef.indexOf('(');
    if (pu > 0) {
      ef = ef.substring(0, pu);
      if (messageEffetTemp[ef]) return ef;
    }
  }

  function messageOfEffetTemp(effetC) {
    let res = messageEffetTemp[effetC];
    if (res) return res;
    let p = effetC.indexOf('(');
    if (p > 0) {
      let ef = effetC.substring(0, p);
      res = messageEffetTemp[ef];
      return res;
    }
    error("Effet temporaire non trouvé", effetC);
  }

  function effetCombatOfAttribute(attr) {
    let ef = attr.get('name');
    if (ef === undefined || messageEffetCombat[ef]) return ef;
    //D'abord on enlève le nom du token
    let pu = ef.indexOf('_MOOK_');
    if (pu > 0) {
      ef = ef.substring(0, pu);
      if (messageEffetCombat[ef]) return ef;
    }
    error("Impossible de déterminer l'effet correspondant à " + ef, attr);
  }

  //Nom d'attribut avec une extension, tenant compte des mook
  function effetWithExtension(baseName, attrName, extension) {
    return baseName + extension + attrName.substr(baseName.length);
  }

  function attributeWithExtensionAsString(perso, baseName, extension, attrName) {
    if (baseName) {
      if (perso.token) return attributeAsString(perso, baseName + extension);
      if (attrName) {
        let fullName = effetWithExtension(baseName, attrName, extension);
        let attrs = findObjs({
          _type: 'attribute',
          _characterid: perso.charId,
          name: fullName
        });
        if (attrs.length === 0) return '';
        else return attrs[0].get('current') + '';
      }
    }
    //On essaie de retrouver le baseName
    if (attrName) {
      let fullName;
      let idx = attrName.indexOf('_MOOK_');
      if (idx < 0) {
        fullName = attrName + extension;
      } else {
        let tokPart = attrName.substring(idx);
        baseName = attrName.substring(0, idx);
        fullName = baseName + extension + tokPart;
      }
      let attrs = findObjs({
        _type: 'attribute',
        _characterid: perso.charId,
        name: fullName
      });
      if (attrs.length === 0) return '';
      else return attrs[0].get('current') + '';
    }
    return '';
  }

  function attributeExtending(charId, attrName, effetC, extension) {
    return findObjs({
      _type: 'attribute',
      _characterid: charId,
      name: effetWithExtension(effetC, attrName, extension),
    });
  }

  //Nom de l'effet, avec la partie générique, mais sans le nom de token
  function effetComplet(effet, attrName) {
    if (effet == attrName) return effet;
    //On a un effet lié à un token ou bien un effet générique
    if (attrName.charAt(effet.length) == '(') {
      let p = attrName.indexOf(')', effet.length);
      if (p > 0) return attrName.substring(0, p + 1);
    }
    return effet;
  }

  function getEffectOptions(perso, effet, options) {
    options = options || {};
    let optionsAttr = tokenAttribute(perso, effet + 'Options');
    optionsAttr.forEach(function(oAttr) {
      parseOptions(oAttr.get('current'), perso.token.get('pageid'), options);
    });
    copyDmgOptionsToTarget(perso, options);
    return options;
  }

  // renvoie l'attribut créé ou mis à jour
  function setAttrDuree(perso, attr, duree, evt, msg, secret) {
    let options = {
      maxVal: getInit(),
      secret: secret
    };
    if (msg) options.msg = msg;
    return setTokenAttr(perso, attr, duree, evt, options);
  }

  // Fait foo sur tous les tokens représentant charId, ayant l'effet donné, et correspondant au nom d'attribut. Pour le cas où le token doit être lié au personnage, on ne prend qu'un seul token, sauf si les options indiquent autrement (soit option.tousLesTokens, soit une fonction options.filterAffected)
  // Ne fonctionne correctement que pour les attributs sans _MOOK_
  function iterTokensOfAttribute(charId, pageId, attrName, attrNameComplet, foo, options) {
    options = options || {};
    let total = 1; //Nombre de tokens affectés, pour gérer l'asynchronie si besoin
    if (attrNameComplet == attrName) { //token lié au character
      let tokens;
      if (pageId) {
        tokens =
          findObjs({
            _type: 'graphic',
            _subtype: 'token',
            _pageid: pageId,
            represents: charId
          });
      }
      if (tokens === undefined ||
        (tokens.length === 0 && !options.onlyOnPage)) {
        tokens =
          findObjs({
            _type: 'graphic',
            _subtype: 'token',
            represents: charId
          });
        tokens = tokens.filter(function(tok) {
          if (tok.get('bar1_link') === '') return false;
          let pid = tok.get('pageid');
          let page = getObj('page', pid);
          if (page) {
            return !(page.get('archived'));
          }
          return false;
        });
      }
      if (tokens.length === 0) {
        log("Pas de token pour un personnage");
        log(charId);
        log(attrNameComplet);
        return;
      }
      if (options.tousLesTokens) {
        tokens.forEach(function(tok) {
          foo(tok, tokens.length);
        });
      } else if (options.filterAffected) {
        total = tokens.length;
        tokens.forEach(function(tok) {
          if (options.filterAffected(tok)) foo(tok, total);
        });
      } else foo(tokens[0], 1);
    } else { //token non lié au character
      let tokenName = attrNameComplet.substring(attrNameComplet.indexOf('_MOOK_') + 6);
      let tNames;
      if (pageId) {
        tNames =
          findObjs({
            _type: 'graphic',
            _subtype: 'token',
            _pageid: pageId,
            represents: charId,
            name: tokenName,
            bar1_link: ''
          });
      }
      if (tNames === undefined || (tNames.length === 0 && !options.onlyOnPage)) {
        tNames =
          findObjs({
            _type: 'graphic',
            _subtype: 'token',
            represents: charId,
            name: tokenName,
            bar1_link: ''
          });
        tNames = tNames.filter(function(tok) {
          let pid = tok.get('pageid');
          let page = getObj('page', pid);
          if (page) {
            return !(page.get('archived'));
          }
          return false;
        });
      }
      total = tNames.length;
      if (total > 1) {
        //On regarde combien il y en a dans le layer objects.
        let tObjects = tNames.filter(function(tok) {
          return tok.get('layer') == 'objects';
        });
        let totalObjects = tObjects.length;
        if (totalObjects > 0) {
          tNames = tObjects;
          total = totalObjects;
        }
        if (total > 1) {
          let character = getObj('character', charId);
          let charName = "d'id " + charId;
          if (character) charName = character.get('name');
          error("Attention, il y a plusieurs tokens nommés " + tokenName, total);
          log("  tokens instances du personnage " + charName, total);
        }
      }
      tNames.forEach(function(tok) {
        foo(tok, total);
      });
    }
  }

  //L'argument effetC doit être le nom complet, pas la base
  //evt.deletedAttributes doit être défini
  function enleverEffetAttribut(charId, effetC, attrName, extension, evt) {
    let attrSave = attributeExtending(charId, attrName, effetC, extension);
    attrSave.forEach(function(attrS) {
      evt.deletedAttributes.push(attrS);
      attrS.remove();
    });
  }

  function changeTokenSide(perso, side, evt) {
    let token = perso.token;
    let sides = token.get('sides');
    if (sides === '') {
      error("Token avec une seule face", side);
      return;
    }
    sides = sides.split('|');
    if (side < 0 || side >= sides.length) {
      error("Le token de " + nomPerso(perso) + " n'a pas de face numéro " + side, sides);
      return;
    }
    let oldSide = token.get('currentSide');
    affectToken(token, 'currentSide', oldSide, evt);
    let oldImage = token.get('imgsrc');
    affectToken(token, 'imgsrc', oldImage, evt);
    token.set('currentSide', side);
    token.set('imgsrc', normalizeTokenImg(decodeURIComponent(sides[side])));
    return oldSide;
  }

  //Si la fin d'effet change des token, c'est retourné dans un struct
  // - oldTokenId
  // - newTokenId
  // - newToken
  function finDEffet(attr, effet, attrName, charId, evt, options = {}) { //L'effet arrive en fin de vie, doit être supprimé
    evt.deletedAttributes = evt.deletedAttributes || [];
    let res;
    let newInit = [];
    let efComplet = effetComplet(effet, attrName);
    //Si on a un attrSave, alors on a déjà imprimé le message de fin d'effet
    if (options.attrSave) { //on a un attribut associé à supprimer)
      evt.deletedAttributes.push(options.attrSave);
      options.attrSave.remove();
    } else if (options.gardeAutresAttributs === undefined) { //On cherche si il y en a un
      enleverEffetAttribut(charId, efComplet, attrName, 'SaveParTour', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'SaveActifParTour', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'SaveParTourType', evt);
    }
    let mEffet = messageEffetTemp[effet];
    if (mEffet === undefined) mEffet = messageEffetCombat[effet];
    if (mEffet && mEffet.statusMarker) {
      iterTokensOfAttribute(charId, options.pageId, effet, attrName, function(token) {
        affectToken(token, 'statusmarkers', token.get('statusmarkers'), evt);
        token.set('status_' + mEffet.statusMarker, false);
      }, {
        tousLesTokens: true
      });
    }
    if (mEffet && mEffet.eclaire) {
      iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
        let perso = {
          token,
          charId
        };
        eteindreUneLumiere(perso, options.pageId, undefined, efComplet, evt);
      });
    }
    let character;
    let combat = stateCOF.combat;
    switch (effet) {
      case 'aveugleTemp':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'aveugle', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'penombreTemp':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'penombre', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'ralentiTemp':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'ralenti', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'paralyseTemp':
      case 'paralyseGoule':
      case 'poisonParalysant':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'paralyse', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'immobiliseTemp':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'immobilise', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'etourdiTemp':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'etourdi', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'affaibliTemp':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'affaibli', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'assommeTemp':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'assomme', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'invisibleTemp':
      case 'intangibleInvisible':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'invisible', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'apeureTemp':
      case 'peurEtourdi':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName,
          function(token) {
            setState({
              token: token,
              charId: charId
            }, 'apeure', false, evt, {
              fromTemp: true
            });
          }, {
            tousLesTokens: true
          });
        break;
      case 'ombreMortelle':
      case 'dedoublement':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName, function(token) {
          deleteTokenWithUndo(token, evt);
        });
        break;
      case 'murDeForce':
        iterTokensOfAttribute(charId, options.pageId, effet, attrName, function(token) {
          let attrM = tokenAttribute({
            charId: charId,
            token: token
          }, 'murDeForceId');
          if (attrM.length === 0) return;
          let imageMur = getObj('graphic', attrM[0].get('current'));
          if (imageMur) {
            imageMur.remove();
          }
          attrM[0].remove();
        });
        break;
      case 'zoneDeVie':
        let attrIdName = efComplet + 'Id';
        iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
          let perso = {
            token,
            charId
          };
          let attr = tokenAttribute(perso, attrIdName);
          if (attr.length === 0) return;
          let image = getObj('graphic', attr[0].get('current'));
          if (image) {
            image.remove();
          }
          attr[0].remove();
        });
        break;
      case 'demonInvoque':
      case 'predateurConjure':
      case 'arbreAnime':
      case 'objetAnime':
      case 'degradationZombie': //effacer le personnage
        //Dans le cas d'un Zombie, diminuer la limite du nécromant si nécessaire
        if (effet == 'degradationZombie') {
          let attrNecromant = charAttribute(charId, 'necromant');
          if (attrNecromant.length > 0) {
            let id = attrNecromant[0].get('current');
            let necromant = persoOfId(id, id, options.pageId);
            if (necromant) {
              let attrNbZombie = tokenAttribute(necromant, 'zombiesControles');
              if (attrNbZombie.length > 0) {
                let nbZombie = attrAsInt(attrNbZombie, 1);
                if (nbZombie > 1)
                  setTokenAttr(necromant, 'zombiesControles', nbZombie - 1, evt);
                else attrNbZombie[0].remove();
              }
            }
          }
        }
        if (effet == 'objetAnime') {
          let attr = charAttribute(charId, 'objetAnimePar');
          if (attr.length > 0) {
            let nid = attr[0].get("current");
            let lanceur = persoOfIdName(nid, options.pageId);
            if (lanceur) {
              let attrNbObjets = tokenAttribute(lanceur, 'niveauDesObjetsAnimes');
              if (attrNbObjets.length > 0) {
                let niveauObjets = ficheAttributeAsInt({
                  charId
                }, 'niveau', 1);
                let nbObjets = attrAsInt(attrNbObjets, niveauObjets);
                if (nbObjets > niveauObjets)
                  setTokenAttr(lanceur, 'niveauDesObjetsAnimes', nbObjets - niveauObjets, evt);
                else attrNbObjets[0].remove();
              }
            }
          }
        }
        //On efface d'abord les attributs et les abilities
        let charAttributes = findObjs({
          _type: 'attribute',
          _characterid: charId
        });
        charAttributes.forEach(
          function(otherAttr) {
            if (otherAttr.id != attr.id) otherAttr.remove();
          }
        );
        let charAbilities = findObjs({
          _type: 'ability',
          _characterid: charId
        });
        charAbilities.forEach(
          function(ab) {
            ab.remove();
          }
        );
        if (effet == 'arbreAnime' || (effet == 'objetAnime' && predicateAsBool({
            charId
          }, 'animeAPartirDExistant'))) {
          iterTokensOfAttribute(charId, options.pageId, effet, attrName,
            function(token) {
              let perso = {
                token: token,
                charId: charId
              };
              let nA = removeFromTurnTracker(perso, evt);
              if (nA) {
                res = res || {};
                res.oldTokenId = token.id;
                res.newTokenId = nA.nextId;
              }
              setToken(token, 'bar1_link', '', evt);
              setToken(token, 'bar1_value', '', evt);
              setToken(token, 'bar1_max', '', evt);
              setToken(token, 'showplayers_bar1', false, evt);
              setToken(token, 'represents', '', evt);
              setToken(token, 'showname', false, evt);
              setToken(token, 'showplayers_name', false, evt);
              setToken(token, 'name', '', evt);
            });
        } else {
          iterTokensOfAttribute(charId, options.pageId, effet, attrName, function(token) {
            let perso = {
              token: token,
              charId: charId
            };
            let nP = removeFromTurnTracker(perso, evt);
            if (nP) {
              res = res || {};
              res.oldTokenId = token.id;
              res.newTokenId = nP.nextId;
            }
            deleteTokenWithUndo(token, evt);
          });
        }
        attr.remove();
        let msgFin = messageFin({
          charId
        }, mEffet, efComplet, attrName);
        if (options.print && mEffet) options.print(msgFin);
        else {
          sendChar(charId, msgFin, true);
          options.print = function(m) {};
        }
        character = getObj('character', charId);
        if (character) {
          evt.deletedCharacters = evt.deletedCharacters || [];
          let deletedChar = {
            id: charId,
            name: character.get('name'),
            avatar: character.get('avatar'),
            attributes: charAttributes,
            abilities: charAbilities,
            allies: []
          };
          // Retrait du perso de toutes les listes d'alliés
          for (const [perso, alliesPerso] of Object.entries(alliesParPerso)) {
            if (alliesPerso.has(charId)) {
              deletedChar.allies.push(perso);
              alliesPerso.delete(charId);
            }
          }
          character.remove();
          evt.deletedCharacters.push(deletedChar);
        }
        return res; //Pas besoin de faire le reste, car plus de perso
      case 'formeDArbre':
        {
          let iterTokOptions = {
            filterAffected: function(token) {
              return token.get('layer') == 'objects';
            }
          };
          iterTokensOfAttribute(charId, options.pageId, effet, attrName,
            function(token) {
              let perso = {
                token,
                charId
              };
              let resa = restoreTokenOfPerso(perso, evt);
              if (resa) {
                setToken(resa.newToken, 'width', token.get('width'), evt);
                setToken(resa.newToken, 'height', token.get('height'), evt);
                token = resa.newToken;
                res = resa;
              }
              let apv = tokenAttribute(perso, 'anciensPV');
              if (apv.length > 0) {
                updateCurrentBar(perso, 1, apv[0].get('current'), evt, apv[0].get('max'));
                removeTokenAttr(perso, 'anciensPV', evt);
                if (combat) {
                  newInit.push(token.id);
                }
              }
            },
            iterTokOptions);
          break;
        }
      case 'effetRetarde':
        if (efComplet.length > 14) {
          let effetRetarde = efComplet.substring(13, efComplet.length - 1);
          if (_.has(cof_states, effetRetarde)) {
            iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
              let perso = {
                token: token,
                charId: charId
              };
              if (getState(perso, 'mort')) return;
              setState(perso, effetRetarde, true, evt);
            });
          } else if (estEffetTemp(effetRetarde)) {
            options.print = function(m) {}; //Pour ne pas afficher le message final.
            let pp = effetRetarde.indexOf('(');
            let mEffetRetarde = (pp > 0) ? messageEffetTemp[effetRetarde.substring(effetRetarde, pp)] : messageEffetTemp[effetRetarde];
            let ef = {
              effet: effetRetarde,
              duree: 1,
              message: mEffetRetarde,
              whisper: true,
            };
            iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
              let perso = {
                token,
                charId
              };
              if (getState(perso, 'mort')) return;
              if (!combat) {
                sendChat('', "Il restait un effet retardé " + effetRetarde + " qui devait se déclencher pour " + token.get('name'));
                return;
              }
              let duree = getIntValeurOfEffet(perso, efComplet, 1);
              ef.duree = duree;
              setEffetTemporaire(perso, ef, duree, evt, {});
            });
          } else {
            options.print = function(m) {}; //Pour ne pas afficher le message final.
            iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
              let perso = {
                token: token,
                charId: charId
              };
              if (getState(perso, 'mort')) return;
              let val = true;
              let valAttr = tokenAttribute(perso, efComplet + 'Valeur');
              if (valAttr.length > 0) val = valAttr[0].get('current');
              whisperChar(charId, effetRetarde + ' ' + val);
              setTokenAttr(perso, effetRetarde, val, evt, {});
            });
          }
        }
        break;
      case 'poisonAffaiblissantLatent':
        options.print = function(m) {}; //Pour ne pas afficher le message final.
        iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
          let perso = {
            token: token,
            charId: charId
          };
          if (getState(perso, 'mort')) return;
          whisperChar(charId, "Le poison commence à faire effet !");
          setTokenAttr(perso, 'poisonAffaiblissantLong', true, evt, {});
        });
        break;
      case 'messageRetarde':
        if (efComplet.length > 16) {
          let messageRetarde = efComplet.substring(15, efComplet.length - 1);
          iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
            whisperChar(charId, messageRetarde);
            //Puis on regarde si il y a une valeur à afficher
            let perso = {
              token: token,
              charId: charId
            };
            let valAttr = tokenAttribute(perso, efComplet + 'Valeur');
            if (valAttr.length > 0)
              whisperChar(charId, valAttr[0].get('current').replace(/_/g, ' '));
          });
        }
        break;
      case 'tenebres':
        iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
          //Puis on regarde si il y a une valeur à afficher
          let perso = {
            token: token,
            charId: charId
          };
          let valAttr = tokenAttribute(perso, efComplet + 'Valeur');
          let tokenTenebres = getObj('graphic', valAttr[0].get('current'));
          if (tokenTenebres) tokenTenebres.remove();
        });
        break;
      case 'brumes':
        iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
          //Puis on regarde si il y a une valeur à afficher
          let perso = {
            token: token,
            charId: charId
          };
          let valAttr = tokenAttribute(perso, efComplet + 'Valeur');
          let tokenTenebres = getObj('graphic', valAttr[0].get('current'));
          if (tokenTenebres) tokenTenebres.remove();
        });
        break;
      case 'armeeDesMorts':
        {
          iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
            token.set("aura2_radius", 0);
            if (combat.armeesDesMorts && combat.armeesDesMorts[token.id]) {
              if (!evt.combat) evt.combat = {...combat
              };
              evt.combat.armeesDesMorts = {...combat.armeesDesMorts
              };
              combat.armeesDesMorts[token.id] = undefined;
            }
          });
          break;
        }
      case 'lienDeSang':
        iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
          let perso = {
            token: token,
            charId: charId
          };
          let attrsLienDeSangDe = tokenAttribute(perso, "lienDeSangDe");
          attrsLienDeSangDe.forEach(function(attr) {
            let tokenLie = persoOfId(attr.get("current"));
            if (tokenLie) {
              tokenAttribute(tokenLie, "lienDeSangVers").forEach(function(a) {
                a.remove();
              });
            }
            attr.remove();
          });
        });
        break;
      default:
    }
    if (options.attrSave === undefined && charId) {
      let estMort = true;
      iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
        estMort = estMort && getState({
          charId: charId,
          token: token
        }, 'mort');
      });
      if (!estMort && mEffet) {
        let msgFin = messageFin({
          charId
        }, mEffet, efComplet, attrName);
        if (options.print) options.print(msgFin);
        else {
          if (attrName == efComplet)
            sendChar(charId, msgFin, true);
          else {
            let tokenName = attrName.substring(attrName.indexOf('_') + 1);
            sendChat('', tokenName + ' ' + msgFin);
          }
        }
      }
    }
    if (options.gardeAutresAttributs === undefined && charId) {
      enleverEffetAttribut(charId, efComplet, attrName, 'Puissant', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'Valeur', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'TempeteDeManaIntense', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'DureeAccumulee', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'Options', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'Activation', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'Actif', evt);
      enleverEffetAttribut(charId, efComplet, attrName, 'Fin', evt);
    }
    //On remet la face du token
    let attrTS = attributeExtending(charId, attrName, efComplet, 'TokenSide');
    if (attrTS.length > 0) {
      attrTS = attrTS[0];
      let side = attrTS.get('current');
      iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
        changeTokenSide({
          token
        }, side, evt);
      }, {
        tousLesTokens: true
      });
      evt.deletedAttributes.push(attrTS);
      attrTS.remove();
    }
    evt.deletedAttributes.push(attr);
    attr.remove();
    //Débloque les tokens si l'effet les immobilisait
    switch (effet) {
      case 'bloqueManoeuvre':
      case 'prisonVegetale':
      case 'toiles':
      case 'statueDeBois':
      case 'petrifie':
      case 'paralysieRoublard':
        iterTokensOfAttribute(charId, options.pageId, efComplet, attrName, function(token) {
          let perso = {
            token: token,
            charId: charId
          };
          unlockToken(perso, evt);
        });
    }
    if (newInit.length > 0) initiative(newInit, evt, true);
    return res;
  }

  function finDEffetDeNom(perso, effet, evt, options) { //Supprime l'effet si présent
    let attrs = tokenAttribute(perso, effet);
    if (attrs.length === 0) return;
    attrs = attrs[0];
    options = options || {};
    options.pageId = options.pageId || perso.token.get('pageid');
    finDEffet(attrs, effetTempOfAttribute(attrs), attrs.get('name'), perso.charId, evt, options);
  }

  //retourne un entier
  function getIntValeurOfEffet(perso, effet, def, predDef) {
    let attrsVal = tokenAttribute(perso, effet + 'Valeur');
    if (attrsVal.length === 0) {
      if (predDef) return predicateAsInt(perso, predDef, def);
      return def;
    }
    return toInt(attrsVal[0].get('current'), def);
  }

  function addEffetTemporaireLie(perso, attr, evt) {
    let etlAttr = tokenAttribute(perso, 'effetsTemporairesLies');
    if (etlAttr.length === 0) {
      etlAttr = createObj('attribute', {
        characterid: perso.charId,
        name: 'effetsTemporairesLies',
        current: attr.id,
      });
      evt.attributes.push({
        attribute: etlAttr,
      });
      return;
    }
    etlAttr = etlAttr[0];
    let etl = etlAttr.get('current');
    evt.attributes.push({
      attribute: etlAttr,
      current: etl
    });
    if (etl === '') etl = attr.id;
    else etl += ',' + attr.id;
    etlAttr.set('current', etl);
  }

  //Met un effet temporaire sur target. L'effet temporaire est spécifié dans ef
  // - effet : le nom de l'effet
  // - whisper : true si on doit chuchoter l'effet, undefined si on n'affiche pas (mais dans ce cas, target.messages doit être défini)
  // - duree : true si c'est un effet à durée en tours
  // - effetIndetermine : true si l'effet a une durée indéterminée (pas combat)
  // - accumuleDuree : si la durée peut s'accumuler
  // - typeDmg : le type de dégâts associé à l'effet, si pertinent
  // - message : la structure de messages (venant de messageEffetTemp ou autre)
  //   - dm : l'effet fait des dégâts
  //   - visible : l'effet est visible
  //   - prejudiciable : l'effet est préjudiciable (et donc cible de délivrance)
  //   - statusMarker : marker associé à l'effet
  // - pasDeMessageDActivation : pour ne pas afficher le message d'activation
  // - image : lien d'une image à afficher
  // - valeur : valeur associée à l'effet
  // - valeurMax : champ max de l'attribut valeur associé à l'effet
  // - saveParTour : caractéristiques du save par tour, si besoin.
  // - saveActifParTour : caractéristiques du save actif par tour, si besoin.
  // - attaquant : la personne à l'origine de l'effet
  // - options : des options à mettre dans l'attribut d'options
  // - tokenSide : change le côté du token à cette face
  // - actif : message à afficher quand l'effet est actif
  // - activation: message à afficher quand l'effet s'active
  // - fin : message à afficher à la fin de l'effet
  function setEffetTemporaire(target, ef, duree, evt, options) {
    if (estImmuniseAEffet(target, ef.effet)) {
      if (ef.whisper !== undefined) {
        if (ef.whisper === true) {
          whisperChar(target.charId, "ne peut pas être affecté par l'effet de " + ef.effet);
        } else {
          sendChar(target.charId, ef.whisper + "ne peut pas être affecté par l'effet de " + ef.effet);
        }
      } else {
        target.messages.push(nomPerso(target) + " ne peut pas être affecté par l'effet de " + ef.effet);
      }
      return;
    }
    if (ef.effet == 'saignementsSang' && immuniseAuxSaignements(target)) {
      if (ef.whisper !== undefined) {
        if (ef.whisper === true) {
          whisperChar(target.charId, "ne peut pas saigner");
        } else {
          sendChar(target.charId, ef.whisper + "ne peut pas saigner");
        }
      } else {
        target.messages.push(nomPerso(target) + " ne peut pas saigner");
      }
      return;
    }
    if (ef.effet.endsWith('Temp')) {
      let etat = ef.effet.substring(0, ef.effet.length - 4);
      if (predicateAsBool(target, 'immunite_' + etat)) {
        sendPerso(target, 'ne peut pas être ' + stringOfEtat(etat, target));
        return;
      }
    } else if (ef.effet == 'paralyseGoule' || ef.effet == 'poisonParalysant') {
      if (predicateAsBool(target, 'immunite_paralyse')) {
        sendPerso(target, 'ne peut pas être ' + stringOfEtat('paralyse', target));
        return;
      }
    }
    if (ef.effet === 'lienDeSang') {
      if (ef.attaquant === undefined) {
        error("Effet de lien de sans sans attaquant", ef);
        return;
      }
      let opt = {
        copy: true
      };
      setTokenAttr(ef.attaquant, 'lienDeSangVers', target.token.id, evt, opt);
      setTokenAttr(target, 'lienDeSangDe', ef.attaquant.token.id, evt, opt);
    }
    if (ef.actif !== undefined) {
      setTokenAttr(target, ef.effet + 'Actif', ef.actif, evt);
    }
    if (ef.activation !== undefined) {
      setTokenAttr(target, ef.effet + 'Activation', ef.activation, evt);
    }
    if (ef.fin !== undefined) {
      setTokenAttr(target, ef.effet + 'Fin', ef.fin, evt);
    }
    if (ef.duree) {
      if (ef.typeDmg && (!ef.message || !ef.message.dm) &&
        (predicateAsBool(target, 'diviseEffet_' + ef.typeDmg) ||
          (estElementaire(ef.typeDmg) && predicateAsBool(target, 'diviseEffet_elementaire')))
      ) {
        duree = Math.ceil(duree / 2);
      }
      if (ef.accumuleDuree) {
        if (ef.accumuleDuree > 1 && attributeAsBool(target, ef.effet)) {
          let accumuleAttr = tokenAttribute(target, ef.effet + 'DureeAccumulee');
          if (accumuleAttr.length === 0) {
            setTokenAttr(target, ef.effet + 'DureeAccumulee', duree, evt);
          } else {
            accumuleAttr = accumuleAttr[0];
            let dureeAccumulee = accumuleAttr.get('current') + '';
            if (dureeAccumulee.split(',').length < ef.accumuleDuree - 1) {
              evt.attributes = evt.attributes || [];
              evt.attributes.push({
                attribute: accumuleAttr,
                current: dureeAccumulee
              });
              accumuleAttr.set('current', duree + ',' + dureeAccumulee);
            }
          }
          return; //Pas besoin de réappliquer, effet toujours en cours
        }
      }
      let targetMsg = '';
      if (ef.message && !ef.pasDeMessageDActivation) {
        let msgAct = messageActivation(target, ef.message, ef.effet);
        if (ef.whisper === undefined) {
          targetMsg = nomPerso(target) + " " + msgAct;
        } else if (ef.whisper !== true) {
          targetMsg = ef.whisper + msgAct;
        }
        if (stateCOF.options.affichage.val.duree_effets.val) targetMsg += " (" + duree + " tours)";
        let img = ef.image;
        if (img !== "" && img !== undefined && (img.toLowerCase().endsWith(".jpg") || img.toLowerCase().endsWith(".png") || img.toLowerCase().endsWith(".gif"))) {
          let newLineimg = '<span style="padding: 4px 0;" >  ';
          newLineimg += '<img src="' + img + '" style="width: 80%; display: block; max-width: 100%; height: auto; border-radius: 6px; margin: 0 auto;">';
          newLineimg += '</span>';
          targetMsg += newLineimg;
        }
        if (ef.whisper === undefined) {
          target.messages.push(targetMsg);
          targetMsg = undefined;
        }
      }
      let secret = !(ef.message && ef.message.visible);
      let attrEffet =
        setAttrDuree(target, ef.effet, duree, evt, targetMsg, secret);
      if (ef.attaquant && options.mana !== undefined && ef.message && ef.message.prejudiciable) {
        addEffetTemporaireLie(ef.attaquant, attrEffet, evt);
      }
      switch (ef.effet) {
        case 'apeureTemp':
          setState(target, 'apeure', true, evt);
          break;
        case 'aveugleTemp':
          setState(target, 'aveugle', true, evt);
          break;
        case 'penombreTemp':
          setState(target, 'penombre', true, evt);
          break;
        case 'ralentiTemp':
          setState(target, 'ralenti', true, evt);
          break;
        case 'paralyseTemp':
        case 'paralyseGoule':
        case 'poisonParalysant':
          setState(target, 'paralyse', true, evt);
          break;
        case 'immobiliseTemp':
          setState(target, 'immobilise', true, evt);
          break;
        case 'etourdiTemp':
          setState(target, 'etourdi', true, evt);
          break;
        case 'affaibliTemp':
          setState(target, 'affaibli', true, evt);
          break;
        case 'assommeTemp':
          setState(target, 'assomme', true, evt);
          break;
        case 'invisibleTemp':
        case 'intangibleInvisible':
          setState(target, 'invisible', true, evt);
          break;
        case 'aspectDuDemon':
          //On retire l'autre aspect du Nécromancien si il est présent
          finDEffetDeNom(target, "aspectDeLaSuccube", evt);
          break;
        case 'aspectDeLaSuccube':
          finDEffetDeNom(target, "aspectDuDemon", evt);
          break;
        case 'peauDePierreMag':
          if (ef.valeur === undefined) {
            let lanceur = target;
            if (ef.attaquant) lanceur = ef.attaquant;
            let rd = 5 + modCarac(lanceur, 'intelligence');
            let absorbe = 40;
            if (options.tempeteDeManaIntense) {
              rd += options.tempeteDeManaIntense;
              absorbe += options.tempeteDeManaIntense * 5;
            }
            setTokenAttr(target, 'peauDePierreMagValeur', rd, evt, {
              maxVal: absorbe
            });
          }
          break;
        case 'hemorragie':
        case 'blessureSanglante':
        case 'saignementsSang':
          if (ef.attaquant && predicateAsBool(ef.attaquant, 'drainDeSang')) {
            let attAttr = ef.attaquant.token.id + ':' + attrEffet.id;
            let attrDrain = tokenAttribute(target, 'attributDeCombat_drainDeSang');
            if (attrDrain.length > 0) {
              attrDrain = attrDrain[0];
              let drains = attrDrain.get('current');
              if (!drains.includes(attAttr)) {
                evt.attributes = evt.attributes || [];
                evt.attributes.push({
                  attribute: attrDrain,
                  current: drains
                });
                attrDrain.set('current', drains + ' ' + attAttr);
              }
            } else {
              setTokenAttr(target, 'attributDeCombat_drainDeSang', attAttr, evt);
            }
          }
      }
      if (ef.message && ef.message.statusMarker) {
        affectToken(target.token, 'statusmarkers', target.token.get('statusmarkers'), evt);
        target.token.set('status_' + ef.message.statusMarker, true);
      }
    } else if (ef.effetIndetermine) {
      target.messages.push(nomPerso(target) + " " + messageActivation(target, messageEffetIndetermine[ef.effet], ef.effet));
      setTokenAttr(target, ef.effet, true, evt);
    } else { //On a un effet de combat
      let effetC = messageEffetCombat[ef.effet];
      target.messages.push(nomPerso(target) + " " + messageActivation(target, effetC, ef.effet));
      let attrEffetCombat = setTokenAttr(target, ef.effet, true, evt);
      if (ef.attaquant && options.mana !== undefined && effetC.prejudiciable) {
        addEffetTemporaireLie(ef.attaquant, attrEffetCombat, evt);
      }
    }
    if (ef.valeur !== undefined) {
      setTokenAttr(target, ef.effet + 'Valeur', ef.valeur, evt, {
        maxVal: ef.valeurMax
      });
    }
    if (ef.options !== undefined) {
      setTokenAttr(target, ef.effet + 'Options', ef.options, evt);
    }
    if (ef.tokenSide !== undefined) {
      let oldSide = changeTokenSide(target, ef.tokenSide, evt);
      if (oldSide !== undefined)
        setTokenAttr(target, ef.effet + 'TokenSide', oldSide, evt);
    }
    if (options.tempeteDeManaIntense)
      setTokenAttr(target, ef.effet + 'TempeteDeManaIntense', options.tempeteDeManaIntense, evt);
    if (ef.saveParTour) {
      setTokenAttr(target, ef.effet + 'SaveParTour',
        ef.saveParTour.carac, evt, {
          maxVal: ef.saveParTour.seuil
        });
      if (ef.typeDmg)
        setTokenAttr(target, ef.effet + 'SaveParTourType', ef.typeDmg, evt);
    }
    if (ef.saveActifParTour) {
      setTokenAttr(target, ef.effet + 'SaveActifParTour',
        ef.saveActifParTour.carac, evt, {
          maxVal: ef.saveActifParTour.seuil
        });
      if (ef.typeDmg)
        setTokenAttr(target, ef.effet + 'SaveParTourType', ef.typeDmg, evt);
    }
  }

  function immuniseAsphyxie(target, expliquer) {
    if (predicateAsBool(target, 'creatureArtificielle') ||
      estNonVivant(target)) {
      if (expliquer) expliquer("L'asphyxie est sans effet sur une créature non-vivante");
      return true;
    }
    if (estDemon(target)) {
      if (expliquer) expliquer("L'asphyxie est sans effet sur un démon");
      return true;
    }
    if (predicateAsBool(target, 'vegetatif')) {
      if (expliquer) expliquer("L'asphyxie est sans effet sur une créature végétative");
      return true;
    }
    return false;
  }

  function immuniseAuxSaignements(perso) {
    return predicateAsBool(perso, 'immuniteSaignement') ||
      predicateAsBool(perso, 'controleSanguin');
  }

  function estImmuniseAEffet(target, effet) {
    if (predicateAsBool(target, 'immunite_' + effet)) return true;
    if ((effet == 'statueDeBois' || effet == 'petrifie') &&
      predicateAsBool(target, 'immunite_petrification')) return true;
    return false;
  }

  function actionEffet(attr, effet, attrName, charId, pageId, evt, callBack) {
    switch (effet) {
      case 'putrefaction': //prend 1d6 DM
        degatsParTour(charId, pageId, effet, attrName, {
            nbDe: 1,
            de: 6
          }, 'maladie',
          "pourrit", evt, {
            magique: true
          }, callBack);
        return;
      case 'asphyxie': //prend 1d6 DM
        degatsParTour(charId, pageId, effet, attrName, {
            nbDe: 1,
            de: 6
          }, 'normal',
          "ne peut plus respirer", evt, {
            asphyxie: true
          }, callBack);
        return;
      case 'saignementsSang': //prend 1d6 DM
        if (predicateAsBool({
            charId
          }, 'immuniteSaignement') ||
          predicateAsBool({
            charId
          }, 'controleSanguin')) {
          callBack();
          return;
        }
        degatsParTour(charId, pageId, effet, attrName, {
            nbDe: 1,
            de: 6
          }, 'normal',
          "saigne par tous les orifices du visage", evt, {
            magique: true,
            saignement: true
          }, callBack);
        return;
      case 'blessureSanglante': //prend 1d6 DM
        if (predicateAsBool({
            charId
          }, 'immuniteSaignement') ||
          predicateAsBool({
            charId
          }, 'controleSanguin')) {
          callBack();
          return;
        }
        degatsParTour(charId, pageId, effet, attrName, {
            nbDe: 1,
            de: 6
          }, 'normal',
          "saigne abondamment", evt, {
            saignement: true
          }, callBack);
        return;
      case 'armureBrulante': //prend 1d4 DM
        degatsParTour(charId, pageId, effet, attrName, {
            nbDe: 1,
            de: 4
          }, 'feu',
          "brûle dans son armure", evt, {
            valeur: 'armureBrulanteValeur'
          }, callBack);
        return;
      case 'nueeDInsectes': //prend 1 DM
        degatsParTour(charId, pageId, effet, attrName, {
            cst: 1
          }, 'normal',
          "est piqué par les insectes", evt, {
            valeur: 'nueeDInsectesValeur'
          }, callBack);
        return;
      case 'nueeDeCriquets': //prend 1 DM
        degatsParTour(charId, pageId, effet, attrName, {
            cst: 2
          }, 'normal',
          "est piqué par les criquets", evt, {}, callBack);
        return;
      case 'nueeDeScorpions': //prend 1D6 DM
        degatsParTour(charId, pageId, effet, attrName, {
            nbDe: 1,
            de: 6
          }, 'normal',
          "est piqué par les scorpions", evt, {}, callBack);
        return;
      case 'armeBrulante': //prend 1 DM
        degatsParTour(charId, pageId, effet, attrName, {
            cst: 1
          }, 'feu',
          "se brûle avec son arme", evt, {
            valeur: 'armeBrulanteValeur'
          }, callBack);
        return;
      case 'regeneration': //soigne
        soigneParTour(charId, pageId, effet, attrName, 3, "régénère", evt, {
          valeur: 'regenerationValeur'
        }, callBack);
        return;
      case 'strangulation':
        let nameDureeStrang = 'dureeStrangulation';
        if (effet != attrName) { //concerne un token non lié
          nameDureeStrang += attrName.substring(attrName.indexOf('_'));
        }
        let dureeStrang = findObjs({
          _type: 'attribute',
          _characterid: charId,
          name: nameDureeStrang
        });
        if (dureeStrang.length === 0) {
          let attrDuree = createObj('attribute', {
            characterid: charId,
            name: nameDureeStrang,
            current: 0,
            max: false
          });
          evt.attributes.push({
            attribute: attrDuree,
          });
        } else {
          let strangUpdate = dureeStrang[0].get('max');
          if (strangUpdate) { //a été mis à jour il y a au plus 1 tour
            evt.attributes.push({
              attribute: dureeStrang[0],
              current: dureeStrang[0].get('current'),
              max: strangUpdate
            });
            dureeStrang[0].set('max', false);
          } else { //Ça fait trop longtemps, on arrête tout
            let efComplet = effetComplet(effet, attrName);
            sendChar(charId, messageFin({
              charId
            }, messageEffetTemp[effet], efComplet), true);
            evt.attributes.pop(); //On enlève des attributs modifiés pour mettre dans les attribute supprimés.
            evt.deletedAttributes.push(attr);
            attr.remove();
            evt.deletedAttributes.push(dureeStrang[0]);
            dureeStrang[0].remove();
          }
        }
        callBack();
        return;
      case 'dotGen':
        {
          let effetC = effetComplet(effet, attrName);
          degatsParTour(charId, pageId, effetC, attrName, {}, '', "", evt, {
            dotGen: true
          }, callBack);
          return;
        }
      case 'zoneDeVie':
        {
          let effetC = effetComplet(effet, attrName);
          let count = -1;
          let fin = function() {
            count--;
            if (count === 0 && callBack) callBack();
          };
          iterTokensOfAttribute(charId, pageId, effetC, attrName,
            function(token, total) {
              if (count < 0) count = total;
              let perso = {
                charId,
                token
              };
              if (getState(perso, 'mort')) {
                fin();
                return;
              }
              let attrTok = tokenAttribute(perso, effetC + 'Id');
              if (attrTok.length === 0) {
                fin();
                return;
              }
              let tokId = attrTok[0].get('current');
              let tokZone = getObj('graphic', tokId);
              if (!tokZone) {
                attrTok[0].remove();
                fin();
                return;
              }
              let allies = alliesParPerso[charId] || new Set();
              allies.add(charId);
              let pageId = tokZone.get('pageid');
              let cx = tokZone.get('left');
              let cy = tokZone.get('top');
              let dx = tokZone.get('width');
              let dy = tokZone.get('height');
              let minx = cx - dx / 2;
              let maxx = cx + dx / 2;
              let miny = cy - dy / 2;
              let maxy = cy + dy / 2;
              let allToks = findObjs({
                _type: 'graphic',
                _pageid: pageId,
                _subtype: 'token',
              });
              let cibles = [];
              allToks.forEach(function(tok) {
                let tx = tok.get('left');
                if (tx < minx || tx > maxx) return;
                let ty = tok.get('top');
                if (ty < miny || ty > maxy) return;
                let cible = persoOfToken(tok);
                if (!cible || !allies.has(cible.charId) || getState(cible, 'mort')) return;
                cibles.push(cible);
              });
              if (cibles.length === 0) {
                fin();
                return;
              }
              count--; //On a fini avec perso.
              count += cibles.length; //On ajoute les cibles
              cibles.forEach(function(cible) {
                sendChat('', "[[2d6]]", function(res) {
                  let rolls = res[0];
                  let soinRoll = rolls.inlinerolls[0];
                  let soins = soinRoll.results.total;
                  let displaySoins = buildinline(soinRoll, 'normal', true);
                  soigneToken(cible, soins, evt,
                    function(s) {
                      if (s < soins) sendPerso(cible, "récupère tous ses PV.");
                      else if (s == soins)
                        sendPerso(cible, "récupère " + displaySoins + " PV.");
                      else
                        sendPerso(cible, "récupère " + s + " PV. (Le jet était " + displaySoins + ")");
                      fin();
                    }, fin);
                }); //fin sendChat du jet de dé
              });
            });
          return;
        }
      default:
        callBack();
        return;
    }
  }

  // Ce qui concerne les positions et distance ------------------------------
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

  // prend une distance en mètre et retourne une distance dans l'unité
  // utilisée sur la page du personnage
  function scaleDistance(perso, distance) {
    if (perso.scale) return distance * perso.scale;
    let pageId = perso.token.get('pageid');
    const page = getObj('page', pageId);
    if (page === undefined) {
      perso.scale = 1;
      return distance;
    }
    let unit = page.get('scale_units');
    switch (unit) {
      case 'm':
        perso.scale = 1;
        break;
      case 'ft':
        perso.scale = 3.28084;
        break;
      case 'cm':
        perso.scale = 100;
        break;
      case 'km':
        perso.scale = 0.001;
        break;
      case 'mi':
        perso.scale = 0.000621371;
        break;
      case 'in':
        perso.scale = 39.3701;
        break;
      default:
        sendChat('COF', "Attention, unité de mesure de la page (" + unit + ") non reconnue");
        perso.scale = 1;
    }
    return distance * perso.scale;
  }

  // si le token est plus grand que thresh, réduit la distance
  function tokenSize(tok, thresh) {
    let size = (tok.get('width') + tok.get('height')) / 2;
    if (size > thresh) return ((size - thresh) / 2);
    return 0;
  }

  // Retourne le diamètre en pixels d'un disque inscrit dans un carré de surface
  // équivalente à celle du token
  function tokenSizeAsCircle(token) {
    const surface = token.get('width') * token.get('height');
    return Math.sqrt(surface);
  }

  function pointOfToken(token) {
    return {
      x: token.get('left'),
      y: token.get('top')
    };
  }

  function distancePoints(pt1, pt2) {
    let x = pt2.x - pt1.x;
    let y = pt2.y - pt1.y;
    return Math.sqrt(x * x + y * y);
  }

  //Distance en pixels entre 2 tokens
  function distancePixToken(tok1, tok2) {
    let x = tok1.get('left') - tok2.get('left');
    let y = tok1.get('top') - tok2.get('top');
    return Math.sqrt(x * x + y * y);
  }

  //Distance en pixels entre un token et un segment
  //le segment est donné par ses extrémités, sous forme de {x, y}
  function distancePixTokenSegment(token, pt1, pt2) {
    let pt = pointOfToken(token);
    let seg = {
      x: pt2.x - pt1.x,
      y: pt2.y - pt1.y
    };
    let vec = {
      x: pt.x - pt1.x,
      y: pt.y - pt1.y
    }; //vecteur de pt1 à pt
    //On regarde d'abord si le projeté de token sur (pt1, pt2) est dans le segment
    let ps = seg.x * vec.x + seg.y * vec.y;
    if (ps <= 0) { //On est avant pt1
      return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    }
    let dseg = seg.x * seg.x + seg.y * seg.y;
    if (ps >= dseg) { //On est après pt2, on retourne donc la distance pt pt2
      let x = pt.x - pt2.x;
      let y = pt.y - pt2.y;
      return Math.sqrt(x * x + y * y);
    }
    //On calcule le déterminant de vec et seg
    let det = vec.x * seg.y - vec.y * seg.x;
    //Et on divise par la longueur du segment
    return Math.abs(det) / Math.sqrt(dseg);
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

  // Les équipes et les sélections ------------------------------------------

  //si alliance, tous les éléments de membres sont supposés être dans alliesParPerso
  //cid est ajouté à membres et à alliesParPerso
  function ajouterMembre(cid, membres, alliance = true) {
    if (alliance) {
      alliesParPerso[cid] = alliesParPerso[cid] || new Set();
      for (const m in membres) {
        alliesParPerso[m].add(cid);
        alliesParPerso[cid].add(m);
      }
    }
    membres[cid] = true;
  }

  //S'assure que tous les membres de l'équipe sont alliés
  function allierEquipe(equipe) {
    let seen = {};
    for (const cid in equipe.membres) {
      ajouterMembre(cid, seen, true);
    }
  }

  function initEquipes(characters) {
    if (stateCOF.equipes) {
      //Il faut calculer les alliés par perso
      const equipes = stateCOF.equipes;
      for (const nom in equipes) {
        let equipe = equipes[nom];
        if (equipe.alliance) allierEquipe(equipe);
      }
    } else {
      stateCOF.numeroEquipe = 1;
      let equipePJ = {};
      stateCOF.equipes = {
        joueurs: {
          alliance: true,
          membres: equipePJ,
        }
      };
      characters.forEach(function(c) {
        if (c.get('controlledby').length === 0) return;
        ajouterMembre(c.id, equipePJ, true);
      });
    }
  }

  function recomputeAlliesParPerso(cid) {
    if (alliesParPerso[cid]) {
      alliesParPerso[cid].forEach(function(allie) {
        if (alliesParPerso[allie]) alliesParPerso[allie].delete(cid);
      });
    }
    alliesParPerso[cid] = new Set();
    let equipes = stateCOF.equipes;
    for (const nom in equipes) {
      let eq = equipes[nom];
      if (eq.alliance && eq.membres[cid]) {
        for (const ocid in eq.membres) {
          if (ocid == cid) continue;
          alliesParPerso[ocid] = alliesParPerso[ocid] || new Set();
          alliesParPerso[ocid].add(cid);
          alliesParPerso[cid].add(ocid);
        }
      }
    }
  }

  function effacerEquipe(equipe, nom) {
    let membres = equipe.membres;
    delete stateCOF.equipes[nom];
    if (!equipe.alliance) return;
    for (const cid in membres) {
      recomputeAlliesParPerso(cid);
    }
  }

  //!cof2-gerer-equipe nom, commandes en option pour pouvoir avoir un nom avec des espaces
  function commandeGererEquipe(msg, cmd, playerId, pageId, options) {
    if (!playerIsGM(playerId)) {
      sendPlayer(msg, "La gestion des équipes est réservée aux MJs", playerId);
      return;
    }
    if (cmd.lenght < 2) {
      error("Il manque le nom de l'équipe à gérer", msg.content);
      return;
    }
    let commande;
    if (options.commande && options.commande.length > 0)
      commande = options.commande[0];
    let creer = commande == 'creer';
    let nom = cmd.slice(1).join(' ');
    let equipe = stateCOF.equipes[nom];
    if (!equipe) {
      if (creer) {
        let evt = {
          type: "Création d'équipe",
          equipeCreee: nom
        };
        addEvent(evt);
        let {
          selected
        } = getSelected(msg, pageId, options);
        let alliance = commande.length < 2 || commande[1] != 'non';
        let membres = {};
        iterSelected(selected, function(perso) {
          if (membres[perso.charId]) return;
          ajouterMembre(perso.charId, membres, alliance);
        });
        equipe = {
          alliance,
          membres
        };
        stateCOF.equipes[nom] = equipe;
      } else {
        let b = boutonSimple("!cof2-gerer-equipe " + nom + ' --commande creer', "créer");
        sendPlayer(msg, "L'équipe " + nom + " n'existe pas. La " + b + "?", playerId);
        return;
      }
    } else if (creer) {
      sendPlayer(msg, "L'équipe " + nom + " existe déjà.", playerId);
      return;
    }
    if (commande == 'effacer') {
      if (nom == 'joueurs') {
        sendPlayer(msg, "Mieux vaux ne pas effacer l'équipe des joueurs", playerId);
        return;
      }
      let evt = {
        type: "Effacer une équipe",
        equipeEffacee: {
          nom,
          equipe
        }
      };
      addEvent(evt);
      effacerEquipe(equipe, nom);
      sendPlayer(msg, "L'équipe " + nom + " est effacée", playerId);
      return;
    }
    if (commande == 'enleverCharId') {
      if (options.commande.length < 2) {
        error("Il manque l'id de la fiche à enlever de l'équipe " + nom, options);
        return;
      }
      let cid = options.commande[1];
      if (equipe.membres[cid]) {
        let evt = {
          type: "Enlever un personnage d'une équipe",
          enleveCharIdEquipe: {
            equipe,
            cid
          }
        };
        addEvent(evt);
        delete equipe.membres[cid];
        if (equipe.alliance) recomputeAlliesParPerso(cid);
      } else {
        error("Impossible de trouver le personnage à enlever de l'équipe " + nom, cid);
      }
    } else if (commande == 'ajouter') {
      let {
        selected
      } = getSelected(msg, pageId, options);
      if (selected.length === 0) {
        sendPlayer(msg, "Aucun token sélectionné pour ajouter à l'équipe " + nom, playerId);
      } else {
        let evt = {
          type: "Ajouter à une équipe",
          ajouterAEquipe: {
            equipe,
            nouveauxMembres: []
          }
        };
        addEvent(evt);
        let seen = new Set();
        iterSelected(selected, function(perso) {
          if (seen.has(perso.charId)) return;
          seen.add(perso.charId);
          if (equipe.membres[perso.charId]) {
            sendPlayer(msg, nomPerso(perso) + " fait déjà partie de l'équipe " + nom, playerId);
            return;
          }
          evt.ajouterAEquipe.nouveauxMembres.push(perso.charId);
          ajouterMembre(perso.charId, equipe.membres, equipe.alliance);
        });
      }
    } else if (commande == 'allier') {
      if (equipe.alliance) {
        sendPlayer(msg, "L'équipe " + nom + " est déjà une alliance.");
      } else {
        const evt = {
          type: "Allier une équipe",
          allierEquipe: equipe
        };
        addEvent(evt);
        equipe.alliance = true;
        allierEquipe(equipe);
      }
    } else if (commande == 'nonAllies') {
      if (equipe.alliance) {
        const evt = {
          type: "Équipe devient non alliée",
          nonAllierEquipe: equipe
        };
        addEvent(evt);
        equipe.alliance = false;
        for (const cid in equipe.membres) {
          recomputeAlliesParPerso(cid);
        }
      } else {
        sendPlayer(msg, "L'équipe " + nom + " n'est pas une alliance.");
      }
    } else if (commande == 'renommer') {
      if (nom == 'joueurs') {
        sendPlayer(msg, "Mieux vaux ne pas renommer l'équipe des joueurs", playerId);
        return;
      }
      if (options.commande.length < 2) {
        error("Il manque le nouveau nom de l'équipe " + nom, options);
        return;
      }
      let nouveauNom = options.commande.slice(1).join(' ');
      if (nouveauNom == nom) {
        sendPlayer(msg, "L'équipe s'appelle déjà " + nom, playerId);
      } else if (stateCOF.equipes[nouveauNom]) {
        sendPlayer(msg, "Il existe déjà une équipe " + nouveauNom, playerId);
      } else {
        const evt = {
          type: "Renommer équipe",
          renommerEquipe: {
            ancienNom: nom,
            nouveauNom
          }
        };
        addEvent(evt);
        stateCOF.equipes[nouveauNom] = equipe;
        delete stateCOF.equipes[nom];
        nom = nouveauNom;
      }
    } else if (commande == 'dupliquer') {
      if (options.commande.length < 2) {
        error("Il manque le nouveau nom ddu double de l'équipe " + nom, options);
        return;
      }
      let nouveauNom = options.commande.slice(1).join(' ');
      if (nouveauNom == nom) {
        sendPlayer(msg, "L'équipe s'appelle déjà " + nom, playerId);
      } else if (stateCOF.equipes[nouveauNom]) {
        sendPlayer(msg, "Il existe déjà une équipe " + nouveauNom, playerId);
      } else {
        const evt = {
          type: "Dupliquer équipe",
          equipeCreee: nouveauNom
        };
        addEvent(evt);
        let nouvelleEquipe = {
          alliance: equipe.alliance,
          membres: {...equipe.membres
          }
        };
        nom = nouveauNom;
        stateCOF.equipes[nom] = nouvelleEquipe;
        equipe = nouvelleEquipe;
      }
    }
    let titre = "Équipe " + nom;
    if (nom != 'joueurs') {
      titre += ' ' + boutonSimple("!cof2-gerer-equipe " + nom + " --commande renommer ?{Nouveau nom d'équipe}", '<span title="renommer", style="font-family: \'Pictos\'">p</span>', BS_BUTTON);
    }
    let action_right = "Pas une alliance";
    if (equipe.alliance) {
      let b = boutonSimple("!cof2-gerer-equipe " + nom + " --commande nonAllies", '<span title="mettre fin à l\'alliance", style="font-family: \'Pictos\'">D</span>', BS_BUTTON);
      action_right = "Alliance " + b;
    } else {
      action_right += ' ' + boutonSimple("!cof2-gerer-equipe " + nom + " --commande allier", '<span title="former une alliance", style="font-family: \'Pictos\'">j</span>', BS_BUTTON);
    }
    const optionsDisplay = {
      secret: true,
      action_right
    };
    const display = startFramedDisplay(playerId, titre, undefined, optionsDisplay);
    startTableInFramedDisplay(display);
    let fond = false;
    for (const cid in equipe.membres) {
      if (!equipe.membres[cid]) {
        delete equipe.membres[cid];
        continue;
      }
      let character = getObj('character', cid);
      if (character === undefined) {
        delete equipe.membres[cid];
        continue;
      }
      addCellInFramedDisplay(display, "&nbsp;" + character.get('name'), 100, true, fond);
      let enlever = boutonSimple("!cof2-gerer-equipe " + nom + " --commande enleverCharId " + cid, '<span title="enlever de l\'équipe", style="font-family: \'Pictos\'">D</span>', BS_BUTTON);
      addCellInFramedDisplay(display, enlever, 100, false, fond, "text-align:right;");
      fond = !fond;
    }
    let ajouter = boutonSimple("!cof2-gerer-equipe " + nom + " --commande ajouter --target @{target|personnage à ajouter|token_id}", '<span title="ajouter un personnage", style="font-family: \'Pictos\'">+</span>', BS_BUTTON);
    let dupliquer = boutonSimple("!cof2-gerer-equipe " + nom + " --commande dupliquer ?{Nom de la nouvelle équipe}", '<span title="dupliquer l\'équipe", style="font-family: \'Pictos\'">|</span>', BS_BUTTON);
    addCellInFramedDisplay(display, "&nbsp;" + ajouter + " &emsp; " + dupliquer, 100, true, fond);
    let lister = boutonSimple("!cof2-lister-equipes", '<span title="Lister toutes les équipes", style="font-family: \'Pictos\'">l</span>', BS_BUTTON);
    addCellInFramedDisplay(display, lister, 100, false, fond);
    sendFramedDisplay(display);
  }

  function commandeListerEquipes(msg, cmd, playerId, pageId, options) {
    if (!playerIsGM(playerId)) {
      sendPlayer(msg, "La gestion des équipes est réservée aux MJs", playerId);
      return;
    }
    let {
      selected
    } = getSelected(msg, pageId, options);
    let equipes = stateCOF.equipes;
    let equipesAGerer = Object.keys(equipes);
    let personnages;
    let seen = new Set();
    let persoPrincipal;
    let plusieursPerso;
    iterSelected(selected, function(perso) {
      if (seen.has(perso.charId)) return;
      seen.add(perso.charId);
      if (!persoPrincipal) persoPrincipal = perso;
      else plusieursPerso = true;
      if (personnages) personnages += '<br> ' + nomPerso(perso);
      else personnages = nomPerso(perso);
      equipesAGerer = equipesAGerer.filter(function(nom) {
        let equipe = equipes[nom];
        return equipe.membres[perso.charId];
      });
    });
    if (equipesAGerer.length === 0) {
      let b = boutonSimple("!cof2-gerer-equipe ?{Nom de la nouvelle équipe} --commande creer", "créer");
      sendPerso(msg, "Aucune équipe en commun pour les personnages sélectionnés : <br>" + personnages + "<br>La " + b + " ?", playerId);
      return;
    }
    let titre = "Équipes";
    const optionsDisplay = {
      secret: true
    };
    if (plusieursPerso) {
      persoPrincipal = undefined;
      titre += " de " + personnages;
    }
    const display = startFramedDisplay(playerId, titre, persoPrincipal, optionsDisplay);
    equipesAGerer.forEach(function(nom) {
      let equipe = equipes[nom];
      let b1 = boutonSimple("!cof2-gerer-equipe " + nom, '<span style="font-family: \'Pictos\'">l</span>', BS_BUTTON);
      let b2 = '';
      if (nom != 'joueurs') b2 = boutonSimple("!cof2-gerer-equipe " + nom + " --commande effacer", '<span title="effacer l\'équipe", style="font-family: \'Pictos\'">D</span>', BS_BUTTON);
      let a = '';
      let nb = Object.keys(equipe.membres).length;
      if (nb === 0) {
        a = ' <span title="équipe vide", style="font-family: \'Pictos\'">d</span>';
      } else if (nb == 1) {
        a = ' <span title="un seul membre dans l\'équipe", style="font-family: \'Pictos\'">U</span>';
      } else if (equipe.alliance) {
        a = ' <span title="alliance", style="font-family: \'Pictos\'">j</span>';
      }
      let ligne = '<table style="width:100%"><tr><td width="25px">' + b1 + '</td> <td>' + nom + a + '</td><td style="text-align:right;">' + b2 + '</td></tr></table>';
      addLineToFramedDisplay(display, ligne);
    });
    let b = boutonSimple("!cof2-gerer-equipe ?{Nom de la nouvelle équipe} --commande creer", '<span title="créer une nouvelle équipe", style="font-family: \'Pictos\'">+</span>', BS_BUTTON);
    addLineToFramedDisplay(display, b);
    sendFramedDisplay(display);
  }

  function chercherNouveauNomEquipe(nom) {
    if (!nom) {
      stateCOF.numeroEquipe = stateCOF.numeroEquipe || 2;
      return chercherNouveauNomEquipe('1');
    }
    stateCOF.numeroEquipe++;
    if (stateCOF.equipes[nom]) return chercherNouveauNomEquipe('1');
    return nom;
  }

  function commandeAllier(msg, cmd, playerId, pageId, options) {
    if (!playerIsGM(playerId)) {
      sendPlayer(msg, "La création d'équipes est réservée aux MJs", playerId);
      return;
    }
    if (options.commande) {
      sendPlayer(msg, "La commande !cof2-allier ne prend pas d'argument --commande", playerId);
    }
    options.commande = [];
    let nom = '' + stateCOF.numeroEquipe;
    if (cmd.length > 1) {
      nom = cmd.slice(1).join(' ');
      if (stateCOF.equipes[nom]) {
        options.commande.push('ajouter');
      } else {
        options.commande.push('creer');
      }
    } else {
      nom = chercherNouveauNomEquipe(nom);
      cmd.push(nom);
      options.commande.push('creer');
    }
  }

  // renvoie {selected, aoe}
  //  selected est une liste de token ids
  //  aoe est un booléen qui indique si on a une aoe.
  function getSelected(msg, pageId, options) {
    if (options.onlySelection) {
      return {
        selected: [options.onlySelection]
      };
    }
    let selectedSet = new Set();
    if (msg.selected) {
      msg.selected.forEach(function(sel) {
        selectedSet.add(sel._id);
      });
    }
    let actif = options.lanceur;
    if (actif === undefined && !options.pasDeLanceur) {
      if (selectedSet.size == 1) {
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
          const equipe = stateCOF.equipes[nomEquipe];
          if (!equipe) {
            error("Équipe " + nomEquipe + " inconnue", cmd);
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
            if (equipe.membres[tokCharId]) {
              uneCible = true;
              selectedSet.add(tok.id);
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
            let saufAllies = (cmd[0] == 'saufAllies');
            let allies = new Set();
            let alliesDe;
            if (cmd.length > 1) {
              alliesDe = [cmd[1]];
            } else if (selectedSet.size === 0) {
              error("Pas d'allié car pas de token sélectionné", msg);
              return;
            } else {
              alliesDe = [...selectedSet];
            }
            iterSelected(alliesDe, function(perso) {
              let alliesPerso = alliesParPerso[perso.charId];
              if (alliesPerso) {
                alliesPerso.forEach(function(ci) {
                  allies.add(ci);
                });
              }
              if (saufAllies) allies.add(perso.charId);
            });
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
              if (saufAllies) selectedSet.delete(tok.id);
              else selectedSet.add(tok.id);
            });
            return;
          }
        case 'target':
          if (cmd.length < 2) {
            error("Il manque l'id de la cible (après --target)", cmd);
            return;
          }
          selectedSet.add(cmd[1]);
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
            selectedSet.add(obj.id);
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
          {
            page = page || getObj("page", pageId);
            murs = getWalls(page, pageId, murs);
            let tokensEnVue = findObjs({
              _type: 'graphic',
              _pageid: pageId,
              _subtype: 'token',
              layer: 'objects'
            });
            if (!murs) {
              tokensEnVue.forEach(function(token) {
                selectedSet.add(token.id);
              });
              return;
            }
            let enVueDe;
            if (cmd.length > 1) {
              enVueDe = [cmd[1]];
            } else if (selectedSet.size === 0) {
              error("Impossible de trouver la personne à partir de laquelle on sélectionne les tokens en vue", msg);
              return;
            } else {
              enVueDe = [...selectedSet];
            }
            let observateurs = new Set();
            iterSelected(enVueDe, function(perso) {
              let pt = pointOfToken(perso.token);
              observateurs.add(pt);
            });
            tokensEnVue.forEach(function(obj) {
              if (actif && obj.id == actif.token.id) return; //on ne se cible pas si le centre de l'aoe est soi-même
              let objCharId = obj.get('represents');
              if (objCharId === '') return;
              if (obj.get('bar1_max') == 0) return; // jshint ignore:line
              let objChar = getObj('character', objCharId);
              if (objChar === undefined) return;
              let visible = false;
              observateurs.forEach(function(pt) {
                if (visible) return;
                visible = !(obstaclePresent(obj.get('left'), obj.get('top'), pt, murs));
              });
              if (visible) selectedSet.add(obj.id);
            });
            return;
          }
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
            selectedSet.add(obj.id);
          });
          return;
        default:
      }
    });
    let selected = [...selectedSet];
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
  function commandeOpenDoor(msg, cmd, playerId, pageId, options) {
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
  function commandeEscalier(msg, cmd, playerId, pageId, options) {
    let {
      selected
    } = getSelected(msg, pageId, options);
    if (selected.length === 0) {
      sendPlayer(msg, "Pas de sélection de token pour !cof2-escalier", playerId);
      log("!cof2-escalier requiert de sélectionner des tokens");
      return;
    }
    pageId = pageId || getObj('graphic', selected[0]).get('pageid');
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

  // Les jets ----------------------------------------------------------

  function pointsDeChance(perso) {
    if (!estPJ(perso)) return 0;
    return ficheAttributeAsInt(perso, 'pc', 0);
  }

  //!cof2-bouton-chance [evt.id] [rollId]
  function commandeBoutonChance(msg, cmd, playerId, pageId, options) {
    if (cmd.length < 2) {
      error("La commande !cof2-bouton-chance n'a pas assez d'arguments", cmd);
      return;
    }
    let evt = findEvent(cmd[1]);
    if (evt === undefined) {
      error("L'action est trop ancienne ou éte annulée", cmd);
      return;
    }
    let action = evt.action;
    if (!action) {
      error("Type d'évènement pas encore géré pour la chance", evt);
      return;
    }
    let perso = evt.personnage;
    let rollId;
    if (cmd.length > 2) {
      let roll = action.rolls[cmd[2]];
      if (roll === undefined) {
        error("Erreur interne du bouton de chance : roll non identifié", cmd);
        return;
      }
      if (roll.token === undefined) {
        error("Erreur interne du bouton de chance : roll sans token", cmd);
        return;
      }
      perso = persoOfId(roll.token.id, roll.token.name, roll.token.pageId);
      rollId = cmd[2];
    }
    if (perso === undefined) {
      error("Erreur interne du bouton de chance : l'évenement n'a pas de personnage", evt);
      return;
    }
    if (!peutController(msg, perso)) {
      sendPlayer(msg, "pas le droit d'utiliser ce bouton");
      return;
    }
    let chance = pointsDeChance(perso);
    if (chance <= 0) {
      sendPerso(perso, "n'a plus de point de chance à dépenser...");
      return;
    }
    let evtChance = {
      type: 'chance',
      rollId
    };
    chance--;
    undoEvent(evt);
    setFicheAttr(perso, 'pc', chance, evtChance, {
      msg: " a dépensé un point de chance. Il lui en reste " + chance
    });
    action.options = action.options || {};
    if (rollId) {
      action.options.chanceRollId = action.options.chanceRollId || {};
      action.options.chanceRollId[rollId] = (action.options.chanceRollId[rollId] + 10) || 10;
    } else {
      action.options.chance = (action.options.chance + 10) || 10;
    }
    if (!redoEvent(evt, action, perso))
      error("Type d'évènement pas encore géré pour la chance", evt);
    addEvent(evtChance);
  }

  function diminueMalediction(lanceur, evt, attr) {
    let attrMalediction = attr || tokenAttribute(lanceur, 'malediction');
    if (attrMalediction.length > 0) {
      attrMalediction = attrMalediction[0];
      let nbMaudit = parseInt(attrMalediction.get('current'));
      if (isNaN(nbMaudit) || nbMaudit < 2) {
        evt.deletedAttributes = evt.deletedAttributes || [];
        evt.deletedAttributes.push(attrMalediction);
        attrMalediction.remove();
      } else {
        evt.attributes = evt.attributes || [];
        evt.attributes.push({
          attribute: attrMalediction,
          current: nbMaudit
        });
        attrMalediction.set('current', nbMaudit - 1);
      }
    }
  }

  //expliquer est optionnel, et si présent, il faut msg
  function malusArmure(personnage, expliquer, msg) {
    let malusArmure = 0;
    if (personnage.malusArmure === undefined) {
      if (ficheAttributeAsInt(personnage, 'armure_eqp', 0, optTransforme))
        malusArmure += ficheAttributeAsInt(personnage, 'armure_malus', 0, optTransforme);
      if (ficheAttributeAsInt(personnage, 'bouclier_eqp', 0, optTransforme))
        malusArmure += ficheAttributeAsInt(personnage, 'bouclier_malus', 0, optTransforme);
      personnage.malusArmures = malusArmure;
    } else malusArmure = personnage.malusArmure;
    if (expliquer && malusArmure > 0) {
      expliquer("Armure : -" + malusArmure + msg);
    }
    return malusArmure;
  }

  function deCarac(x) {
    switch (x) {
      case 'FOR':
        return "de force";
      case 'AGI':
        return "d'agilité";
      case 'CON':
        return "de constitution";
      case 'PER':
        return "de perception";
      case 'VOL':
        return "de volonté";
      case 'INT':
        return "d'intelligence";
      case 'CHA':
        return "de charisme";
      default:
        return "de " + x;
    }
  }

  function bonusArgumentDeTaille(perso, expliquer) {
    let bonus = 0;
    if (predicateAsBool(perso, 'argumentDeTaille')) {
      let modFor = modCarac(perso, 'force');
      if (modFor > 0) {
        bonus += modFor;
        expliquer("Argument de taille : +" + modFor);
      }
    }
    let allies = alliesParPerso[perso.charId];
    if (allies === undefined) return bonus;
    const pageId = perso.token.get('pageid');
    const tokens = findObjs({
      _type: 'graphic',
      _subtype: 'token',
      _pageid: pageId,
      layer: 'objects'
    });
    tokens.forEach(function(tok) {
      if (tok.id == perso.token.id) return;
      let ci = tok.get('represents');
      if (ci === '') return;
      if (!allies.has(ci)) return;
      let allie = {
        token: tok,
        charId: ci
      };
      if (!predicateAsBool(allie, 'argumentDeTaille')) return;
      if (distanceCombat(perso.token, tok, pageId) > 0) return;
      let modFor = modCarac(allie, 'force');
      if (modFor <= 0) return;
      bonus += modFor;
      expliquer("Argument de taille de " + tok.get('name') + " : +" + modFor);
    });
    return bonus;
  }

  function numeroDeVoie(perso, titre) {
    for (let i = 1; i < 10; i++) {
      if (ficheAttribute(perso, 'voie' + i + 'nom', '') == titre) return i;
    }
  }

  function rangDansLaVoie(perso, voie) {
    let v = 'v' + voie + 'r';
    for (let rang = 5; rang >= 0; rang--) {
      if (ficheAttributeAsInt(perso, v + rang, 0) == 1) {
        return rang + ficheAttributeAsInt(perso, 'v' + voie + 'br', 1) - 1;
      }
    }
  }

  function bonusEvolutif(perso, competence) {
    let p = predicatesNamed(perso, 'bonusTestEvolutif_' + competence);
    let res = 0;
    p.forEach(function(voie) {
      if (res >= 7) return;
      //voie peut être le numéro de voie ou le nom
      let numeroVoie = parseInt(voie);
      if (isNaN(numeroVoie) || numeroVoie > 9)
        numeroVoie = numeroDeVoie(perso, voie);
      if (!numeroVoie) {
        error("Impossible de trouver la voie " + voie, competence);
        return;
      }
      let r = rangDansLaVoie(perso, numeroVoie);
      if (r) {
        r = r + 2;
        if (r > res) {
          res = r;
          if (res > 7) res = 7;
        }
      }
    });
    return res;
  }

  function bonusAuxCompetences(perso, comp, expliquer) {
    let bonus = predicateAsInt(perso, 'bonusTest_' + comp, 0);
    bonus += bonusEvolutif(perso, comp);
    bonus += predicateAsInt(perso, 'bonusTestPeuple_' + comp, 0, 3);
    bonus += predicateAsInt(perso, 'bonusTestPrestige_' + comp, 0, 5);
    if (bonus > 15) bonus = 15;
    if (bonus)
      expliquer("Bonus de compétence : " + ((bonus < 0) ? "-" : "+") + bonus);
    //TODO: revoir cette liste
    switch (comp) {
      case 'acrobatie':
      case 'acrobaties':
        {
          if (predicateAsBool(perso, 'graceFelineVoleur')) {
            let bonusGraceFeline = modCarac(perso, 'charisme');
            if (bonusGraceFeline > 0) {
              expliquer("Grâce féline : +" + bonusGraceFeline + " en acrobaties");
              bonus += bonusGraceFeline;
            }
          }
          if (predicateAsBool(perso, 'pirouettes') && malusArmure(perso) <= 4) {
            expliquer("Pirouettes : +5 en acrobaties");
            bonus += 5;
          }
          let a = predicateAsInt(perso, 'ameFeline', 0);
          if (a > 0) {
            expliquer("Âme féline : +" + a + " en acrobaties");
            bonus += a;
          }
          break;
        }
      case 'baratiner':
      case 'bluffer':
        break;
      case 'course':
        {
          if (predicateAsBool(perso, 'graceFelineVoleur')) {
            let bonusGraceFeline = modCarac(perso, 'charisme');
            if (bonusGraceFeline > 0) {
              expliquer("Grâce féline : +" + bonusGraceFeline + " en course");
              bonus += bonusGraceFeline;
            }
          }
          break;
        }
      case 'danse':
        if (predicateAsBool(perso, 'pirouettes') && malusArmure(perso) <= 4) {
          expliquer("Pirouettes : +5 en danse");
          bonus += 5;
        }
        break;
      case 'discrétion':
      case 'discretion':
        if (attributeAsBool(perso, 'foretVivanteEnnemie')) {
          expliquer("Forêt hostile : -5 en discrétion");
          bonus -= 5;
        }
        let perteDeSubstance = 0;
        if (predicateAsBool(perso, 'perteDeSubstance'))
          perteDeSubstance = attributeAsInt(perso, 'perteDeSubstance', 0);
        if (perteDeSubstance >= 5) {
          if (perteDeSubstance < 7) {
            expliquer("Perte de substance : +2 en discrétion");
            bonus += 2;
          } else if (perteDeSubstance < 10) {
            expliquer("Perte de substance : +5 en discrétion");
            bonus += 5;
          } else {
            expliquer("Perte de substance : +10 en discrétion");
            bonus += 10;
          }
        }
        if (predicateAsBool(perso, 'toutPetit') && !attributeAsBool(perso, 'grandeTaille')) {
          expliquer("Tout petit : +5 en discrétion");
          bonus += 5;
        } else if (predicateAsBool(perso, 'petiteTaille')) {
          expliquer("Petite taille : +2 en discrétion");
          bonus += 2;
        }
        let rapideCommeSonOmbre = predicateAsInt(perso, 'rapideCommeSonOmbre', 0, 3);
        if (rapideCommeSonOmbre > 0) {
          expliquer("Rapide comme son ombre : +" + rapideCommeSonOmbre + " en discrétion");
          bonus += rapideCommeSonOmbre;
        }
        if (predicateAsBool(perso, 'embuscade')) {
          expliquer("Prédateur => +5 en discrétion");
          bonus += 5;
        }
        break;
      case 'intimidation':
        bonus += bonusArgumentDeTaille(perso, expliquer);
        if (predicateAsBool(perso, 'ordreDuChevalierDragon') && attributeAsBool(perso, 'monteSur')) {
          expliquer("Chevalier Dragon monté : +5 en intimidation");
          bonus += 5;
        }
        if (predicateAsBool(perso, 'batonDesRunesMortes') &&
          (attributeAsBool(perso, 'runeLizura') || attributeAsBool(perso, 'runeMitrah'))) {
          expliquer("Recouvert" + eForFemale(perso) + " de la boue noire du bâton : +5 aux tests d'intimidation");
          bonus += 5;
        }
        if (predicateAsBool(perso, 'autoriteNaturelle')) {
          expliquer("Autorité naturelle : +5 en intimidation");
          bonus += 5;
        }
        break;
      case 'commander':
        if (predicateAsBool(perso, 'autoriteNaturelle')) {
          expliquer("Autorité naturelle : +5 pour donner des ordres");
          bonus += 5;
        }
        break;
      case 'escalade':
        {
          if (predicateAsBool(perso, 'graceFelineVoleur')) {
            let bonusGraceFeline = modCarac(perso, 'charisme');
            if (bonusGraceFeline > 0) {
              expliquer("Grâce féline : +" + bonusGraceFeline + " en escalade");
              bonus += bonusGraceFeline;
            }
          }
          let a = predicateAsInt(perso, 'ameFeline', 0);
          if (a > 0) {
            expliquer("Âme féline : +" + a + " en escalade");
            bonus += a;
          }
          a = predicateAsInt(perso, 'vitesseDuFelin', 0);
          if (a > 0) {
            expliquer("Vitesse du félin : +" + a + " en escalade");
            bonus += a;
          }
          break;
        }
      case 'mentir':
        break;
      case 'négociation':
      case 'negociation':
        bonus += bonusArgumentDeTaille(perso, expliquer);
        break;
      case 'orientation':
        if (attributeAsBool(perso, 'foretVivanteEnnemie')) {
          expliquer("Forêt hostile : -5 en orientation");
          bonus -= 5;
        }
        break;
      case 'perception':
        if (attributeAsBool(perso, 'foretVivanteEnnemie')) {
          expliquer("Forêt hostile : -5 en perception");
          bonus -= 5;
        }
        break;
      case 'persuasion':
      case 'convaincre':
        bonus += bonusArgumentDeTaille(perso, expliquer);
        if (predicateAsBool(perso, 'ordreDuChevalierDragon') && attributeAsBool(perso, 'monteSur')) {
          expliquer("Chevalier Dragon monté : +5 en persuasion");
          bonus += 5;
        }
        break;
      case 'saut':
      case 'sauter':
        {
          if (predicateAsBool(perso, 'graceFelineVoleur')) {
            let bonusGraceFeline = modCarac(perso, 'charisme');
            if (bonusGraceFeline > 0) {
              expliquer("Grâce féline : +" + bonusGraceFeline + " en saut");
              bonus += bonusGraceFeline;
            }
          }
          break;
        }
      case 'survie':
        if (attributeAsBool(perso, 'foretVivanteEnnemie')) {
          expliquer("Forêt hostile : -5 en survie");
          bonus -= 5;
        }
        break;
    }
    let expertiseSpecialisee =
      predicateAsBool(perso, 'expertiseSpecialisee');
    if (expertiseSpecialisee && typeof expertiseSpecialisee == 'string') {
      expertiseSpecialisee = expertiseSpecialisee.toLowerCase();
      if (expertiseSpecialisee == comp) {
        expliquer("Expertise : +10 aux jet de " + comp);
        bonus += 10;
      }
    }
    return bonus;
  }

  function bonusTestToutesCaracs(personnage, options, evt, expliquer) {
    if (options && options.cacheBonusToutesCaracs) {
      if (options.cacheBonusToutesCaracs.val !== undefined) {
        return options.cacheBonusToutesCaracs.val;
      }
    }
    let bonus = predicateAsInt(personnage, 'bonusTousTests', 0);
    if (bonus)
      expliquer("Bonus aux tests : " + ((bonus < 0) ? "-" : "+") + bonus);
    if (attributeAsBool(personnage, 'chantDesHeros')) {
      let bonusChantDesHeros = getIntValeurOfEffet(personnage, 'chantDesHeros', 1);
      expliquer("Chant des héros : +" + bonusChantDesHeros + " au jet");
      bonus += bonusChantDesHeros;
    }
    if (attributeAsBool(personnage, 'benediction')) {
      let bonusBenediction = getIntValeurOfEffet(personnage, 'benediction', 1);
      expliquer("Bénédiction : +" + bonusBenediction + " au jet");
      bonus += bonusBenediction;
    }
    let fortifie = attributeAsInt(personnage, 'fortifie', 0);
    if (fortifie > 0) {
      expliquer("Fortifié : +3 au jet");
      bonus += 3;
      if (evt) {
        fortifie--;
        if (fortifie === 0) {
          removeTokenAttr(personnage, 'fortifie', evt);
        } else {
          setTokenAttr(personnage, 'fortifie', fortifie, evt);
        }
      }
    }
    let bonusCondition = attributeAsInt(personnage, 'modificateurTests', 0);
    if (bonusCondition != 0) {
      bonus += bonusCondition;
      if (bonusCondition > 0) {
        expliquer("Bonus de condition : +" + bonusCondition);
      } else {
        expliquer("Pénalité de condition : " + bonusCondition);
      }
    }
    if (options) {
      if (options.bonus) bonus += options.bonus;
      if (options.bonusAttrs) {
        options.bonusAttrs.forEach(function(attr) {
          let bonusAttribut = charAttributeAsInt(personnage, attr, 0);
          if (bonusAttribut !== 0) {
            expliquer("Attribut " + attr + " : " + ((bonusAttribut < 0) ? "-" : "+") + bonusAttribut);
            bonus += bonusAttribut;
          }
          if (!options.competence || attr != options.competence.trim().toLowerCase())
            bonus += bonusAuxCompetences(personnage, attr, expliquer);
        });
      }
      if (options.bonusPreds) {
        options.bonusPreds.forEach(function(pred) {
          let bonusPred = predicateAsInt(personnage, pred, 0);
          if (bonusPred !== 0) {
            expliquer("Prédicat " + pred + " : " + ((bonusPred < 0) ? "-" : "+") + bonusPred);
            bonus += bonusPred;
          }
        });
      }
      //TODO: le malus du casque
      if (options.cacheBonusToutesCaracs) {
        options.cacheBonusToutesCaracs.val = bonus;
      }
    }
    let explications = [];
    explications.forEach(function(msg) {
      expliquer(msg);
    });
    return bonus;
  }

  //retourne un entier
  // evt n'est défini que si la caractéristique est effectivement utilisée
  function bonusTestCarac(carac, personnage, options, evt, explications) {
    const expliquer = function(msg) {
      if (explications) explications.push(msg);
    };
    // D'abord la partie qui dépend de la caractéristique
    let bonus = modCarac(personnage, carac);
    if (!persoEstPNJ(personnage)) {
      bonus += ficheAttributeAsInt(personnage, carac.toLowerCase() + "_buff", 0);
    }
    let txt = "Bonus " + deCarac(carac) + " : ";
    if (bonus > 0) txt += '+';
    expliquer(txt + bonus);
    let bonusCarac = bonus;
    let bonusAspectDuDemon;
    let expertiseSpecialisee =
      predicateAsBool(personnage, 'expertiseSpecialisee');
    if (typeof expertiseSpecialisee == 'string')
      expertiseSpecialisee = expertiseSpecialisee.toLowerCase();
    switch (carac) {
      case 'AGI':
        {
          let bonusAGI = predicateAsInt(personnage, 'bonusTest_AGI', 0) + Math.max(predicateAsInt(personnage, 'bonusTest_agilite', 0), predicateAsInt(personnage, 'bonusTest_agilité', 0));
          if (bonusAGI) {
            expliquer("Bonus aux jets d'AGI : " + ((bonusAGI < 0) ? "-" : "+") + bonusAGI);
            bonus += bonusAGI;
          }
          if (attributeAsBool(personnage, 'aspectDuDemon')) {
            bonusAspectDuDemon = getIntValeurOfEffet(personnage, 'aspectDuDemon', 5);
            expliquer("Aspect du démon : +" + bonusAspectDuDemon + " au jet d'AGI");
            bonus += bonusAspectDuDemon;
          }
          if (expertiseSpecialisee == 'agi' || expertiseSpecialisee == 'agilite' || expertiseSpecialisee == 'agilité') {
            expliquer("Expertise : +5 aux jets de DEX");
            bonus += 5;
          }
        }
        break;
      case 'FOR':
        {
          let bonusFOR = predicateAsInt(personnage, 'bonusTest_FOR', 0) + predicateAsInt(personnage, 'bonusTest_force', 0);
          if (bonusFOR) {
            expliquer("Bonus aux jets de FOR : " + ((bonusFOR < 0) ? "-" : "+") + bonusFOR);
            bonus += bonusFOR;
          }
          if (attributeAsBool(personnage, 'aspectDuDemon')) {
            bonusAspectDuDemon = getIntValeurOfEffet(personnage, 'aspectDuDemon', 5);
            expliquer("Aspect du démon : +" + bonusAspectDuDemon + " au jet de FOR");
            bonus += bonusAspectDuDemon;
          }
          if (predicateAsBool(personnage, 'grosseTete')) {
            let bonusInt = modCarac(personnage, 'intelligence');
            if (bonusInt > bonusCarac) {
              let msgGrosseTete = "Grosse tête : ";
              if (bonusInt > 0) msgGrosseTete += '+';
              msgGrosseTete += bonusInt + " au lieu de ";
              if (bonusCarac > 0) msgGrosseTete += '+';
              msgGrosseTete += bonusCarac;
              expliquer(msgGrosseTete);
              bonus += bonusInt - bonusCarac;
            }
          }
          if (expertiseSpecialisee == 'for' || expertiseSpecialisee == 'force') {
            expliquer("Expertise : +5 aux jets de FOR");
            bonus += 5;
          }
          if (attributeAsBool(personnage, 'formeHybride')) {
            let b = 2;
            if (predicateAsBool(personnage, 'formeHybrideSuperieure')) b = 4;
            expliquer("Forme hybride : +" + b + " aux jets de FOR");
            bonus += b;
          }
        }
        break;
      case 'INT':
        {
          let bonusINT = predicateAsInt(personnage, 'bonusTest_INT', 0) + predicateAsInt(personnage, 'bonusTest_intelligence', 0);
          if (bonusINT) {
            expliquer("Bonus aux jets d'INT : " + ((bonusINT < 0) ? "-" : "+") + bonusINT);
            bonus += bonusINT;
          }
          if (expertiseSpecialisee == 'int' || expertiseSpecialisee == 'intelligence') {
            expliquer("Expertise : +5 aux jets d'INT");
            bonus += 5;
          }
        }
        break;
      case 'CHA':
        {
          let bonusCHA = predicateAsInt(personnage, 'bonusTest_CHA', 0) + predicateAsInt(personnage, 'bonusTest_charisme', 0);
          if (bonusCHA) {
            expliquer("Bonus aux jets de CHA : " + ((bonusCHA < 0) ? "-" : "+") + bonusCHA);
            bonus += bonusCHA;
          }
          if (expertiseSpecialisee == 'cha' || expertiseSpecialisee == 'charisme') {
            expliquer("Expertise : +5 aux jets de CHA");
            bonus += 5;
          }
        }
        break;
      case 'CON':
        {
          let bonusCON = predicateAsInt(personnage, 'bonusTest_CON', 0) + predicateAsInt(personnage, 'bonusTest_constitution', 0);
          if (bonusCON) {
            expliquer("Bonus aux jets de CON : " + ((bonusCON < 0) ? "-" : "+") + bonusCON);
            bonus += bonusCON;
          }
          if (attributeAsBool(personnage, 'aspectDuDemon')) {
            bonusAspectDuDemon = getIntValeurOfEffet(personnage, 'aspectDuDemon', 5);
            expliquer("Aspect du démon : +" + bonusAspectDuDemon + " au jet de CON");
            bonus += bonusAspectDuDemon;
          }
          if (expertiseSpecialisee == 'con' || expertiseSpecialisee == 'constitution') {
            expliquer("Expertise : +5 aux jets de CON");
            bonus += 5;
          }
        }
        break;
      case 'PER':
        {
          let bonusSAG = predicateAsInt(personnage, 'bonusTest_PER', 0) + predicateAsInt(personnage, 'bonusTest_peception', 0);
          if (bonusSAG) {
            expliquer("Bonus aux jets de PER : " + ((bonusSAG < 0) ? "-" : "+") + bonusSAG);
            bonus += bonusSAG;
          }
        }
        break;
      case 'VOL':
        {
          let bonusSAG = predicateAsInt(personnage, 'bonusTest_VOL', 0) + predicateAsInt(personnage, 'bonusTest_volonte', 0) + predicateAsInt(personnage, 'bonusTest_volonté', 0);
          if (bonusSAG) {
            expliquer("Bonus aux jets de VOL : " + ((bonusSAG < 0) ? "-" : "+") + bonusSAG);
            bonus += bonusSAG;
          }
        }
        break;
    }
    let bonusCompetence;
    if (options && options.competence) {
      //TODO: implementer avec la nouvelle fiche
    }
    if (bonusCompetence === undefined) {
      if (carac == 'AGI') {
        bonus -= malusArmure(personnage, expliquer, " aux jets d'AGI");
      }
    }
    // Puis la partie commune
    options = options || {};
    bonus += bonusTestToutesCaracs(personnage, options, evt, expliquer);
    //Pas besoin de mettre la valeur de caractéristique si c'est le seul bonus
    if (explications && explications.length == 1) explications.pop();
    return bonus;
  }

  //TODO: enlever perso.affaibli quand on change les PV
  function estAffaibli(perso) {
    if (perso.affaibli !== undefined) return perso.affaibli;
    if (getState(perso, 'affaibli') || getState(perso, 'blesse') ||
      attributeAsBool(perso, 'poisonAffaiblissant') ||
      attributeAsBool(perso, 'poisonAffaiblissantLong')) {
      perso.affaibli = true;
      return true;
    }
    let pv = toInt(perso.token.get('bar1_value'), 1);
    if (pv == 1) {
      perso.affaibli = true;
      return true;
    }
    perso.affaibli = false;
    return false;
  }

  //Calcul de l'expression pour un dé de test (donc d20)
  //options peut préciser
  // - deBonus
  // - deMalus
  function computeDice(lanceur, options = {}) {
    let nbDe = 1;
    let deBonus = options.deBonus;
    let deMalus = options.deMalus || attributeAsBool(lanceur, 'malediction');
    let plusFort = true;
    if (deBonus) {
      if (!deMalus) nbDe = 2;
    } else if (deMalus) {
      nbDe = 2;
      plusFort = false;
    }
    let de = nbDe + "d20";
    if (nbDe > 1) {
      if (plusFort) de += "kh1";
      else de += "kl1";
    }
    return de;
  }

  function caracHeroique(carac, perso) {
    let typeJet = ficheAttribute(perso, carac + '_sup', 'N', optTransforme);
    switch (typeJet) {
      case 'N':
      case '0': //Pour les fiches de PNJ
        return false;
      case 'S':
      case 'H':
      case '1': //Pour les fiches de PNJ
        return true;
      default:
        error("Jet inconnu", typeJet);
    }
    return false;
  }

  // Test de caractéristique
  // options : bonusAttrs, bonusPreds, bonus, roll
  // Après le test, lance callback(testRes, explications
  // testRes.texte est l'affichage du jet de dé
  // testRes.reussite indique si le jet est réussi
  // testRes.reussiteAvecComplications indique que le jet est réussi mais le MJ peut rajouter une complication
  // testRes.echecCritique, testRes.critique pour le type
  // testRes.valeur pour la valeur totale du jet
  // testRes.rerolls pour le texte avec les boutons de rerolls adaptés.
  // testRes.modifiers pour les boutons qui peuvent être activés sur le roll, qu'il soit réussi ou non.
  // Pour que les boutons de rerolls fonctionnent, le type d'évènement doit être supporté par redoEvent()
  // ne rajoute pas evt à l'historique
  function testCaracteristique(personnage, carac, seuil, testId, options, evt, callback) { //asynchrone
    options = options || {};
    let testRes = {};
    let explications = [];
    let bonusCarac = bonusTestCarac(carac, personnage, options, evt, explications);
    let jetCache = ficheAttributeAsBool(personnage, 'togm', false);
    options.deBonus = options.deBonus || caracHeroique(carac, personnage);
    let de = computeDice(personnage, options);
    let plageEC = 1;
    let plageECText = '1';
    if (options.plageEchecCritique) {
      plageEC = options.plageEchecCritique;
      if (plageEC > 1) plageECText = '<' + plageEC;
    }
    let rollExpr = "[[" + de + "cs20cf" + plageECText + "]]";
    try {
      sendChat("", rollExpr, function(res) {
        options.rolls = options.rolls || {};
        let roll = options.rolls[testId] || options.roll || res[0].inlinerolls[0];
        roll.token = personnage.token;
        evt.action = evt.action || {};
        evt.action.rolls = evt.action.rolls || {};
        evt.action.rolls[testId] = roll;
        testRes.roll = roll;
        let d20roll = roll.results.total;
        let bonusText = (bonusCarac > 0) ? "+" + bonusCarac : (bonusCarac === 0) ? "" : bonusCarac;
        testRes.texte = jetCache ? d20roll + bonusCarac : buildinline(roll) + bonusText;
        let chanceUtilisee;
        if (options.chanceRollId && options.chanceRollId[testId]) {
          bonusCarac += options.chanceRollId[testId];
          testRes.texte += "+" + options.chanceRollId[testId];
          chanceUtilisee = true;
        }
        if (d20roll == 20) {
          testRes.reussite = true;
          testRes.critique = true;
        } else if (d20roll <= plageEC && (!chanceUtilisee || d20roll + bonusCarac < seuil)) {
          testRes.reussite = false;
          testRes.echecCritique = true;
          diminueMalediction(personnage, evt);
        } else if (d20roll + bonusCarac >= seuil) {
          testRes.reussite = true;
          testRes.reussiteAvecComplications = chanceUtilisee && d20roll <= plageEC;
        } else {
          diminueMalediction(personnage, evt);
          testRes.reussite = false;
        }
        testRes.valeur = d20roll + bonusCarac;
        testRes.rerolls = '';
        if (!chanceUtilisee && d20roll + bonusCarac + 10 >= seuil) {
          let pc = pointsDeChance(personnage);
          if (pc > 0) {
            testRes.rerolls += '<br/>' +
              boutonSimple("!cof2-bouton-chance " + evt.id + " " + testId, "Chance") +
              " (reste " + pc + " PC)";
          }
        }
        testRes.modifiers = '';
        if (jetCache) sendChat('COF', "/w GM Jet caché : " + buildinline(roll) + bonusText);
        callback(testRes, explications);
      });
    } catch (e) {
      error("Erreur pendant l'évaluation de " + rollExpr + " dans un test de caractéristiques");
      log(e.name + ": " + e.message);
    }
  }

  function stringOfType(t) {
    switch (t) {
      case 'acide':
        return "l'acide";
      case 'electrique':
        return "l'électricité";
      case 'soniqe':
        return "le son";
      case 'maladie':
        return "les maladies";
      case 'argent':
        return "l'argent";
      default:
        return 'le ' + t;
    }
  }

  function probaSucces(de, seuil, nbreDe) {
    if (nbreDe == 2) {
      let proba1 = probaSucces(de, seuil, 1);
      return 1 - (1 - proba1) * (1 - proba1);
    }
    if (seuil < 2) seuil = 2; // 1 est toujours un échec
    else if (seuil > 20) seuil = 20;
    return ((de - seuil) + 1) / de;
  }

  // Meilleure carac parmis 2 pour un save.
  function meilleureCarac(carac1, carac2, personnage, seuil) {
    let sansEsprit;
    if (carac1 == 'VOL' || carac1 == 'INT' || carac1 == 'CHA') {
      sansEsprit = predicateAsBool(personnage, 'sansEsprit') ||
        predicateAsBool(personnage, 'vegetatif');
      if (sansEsprit) return carac1;
    }
    if (sansEsprit === undefined &&
      (carac2 == 'VOL' || carac2 == 'INT' || carac2 == 'CHA')) {
      sansEsprit = predicateAsBool(personnage, 'sansEsprit') ||
        predicateAsBool(personnage, 'vegetatif');
      if (sansEsprit) return carac2;
    }
    const options = {
      cacheBonusToutesCaracs: {}
    };
    let bonus1 = bonusTestCarac(carac1, personnage, options);
    if (carac1 == 'AGI') {
      bonus1 += predicateAsInt(personnage, 'esquive', 0);
    }
    let bonus2 = bonusTestCarac(carac2, personnage, options);
    if (carac2 == 'AGI') {
      bonus2 += predicateAsInt(personnage, 'esquive', 0);
    }
    let nbrDe1 = (caracHeroique(carac1, personnage) ? 2 : 1);
    let nbrDe2 = (caracHeroique(carac2, personnage) ? 2 : 1);
    let proba1 = probaSucces(20, seuil - bonus1, nbrDe1);
    let proba2 = probaSucces(20, seuil - bonus2, nbrDe2);
    if (proba2 > proba1) return carac2;
    return carac1;
  }

  //s représente le save, avec une carac, une carac2 optionnelle et un seuil
  //expliquer est une fonction qui prend en argument un string et le publie
  // options peut contenir les champs :
  //   - msgPour : message d'explication à afficher avant le jet
  //   - msgReussite : message à afficher en cas de réussite
  //   - msgRate : message à afficher si l'action rate
  //   - silencieuxSiPasAffecte: ne rien afficher pour les cibles immunisées
  //   - regard: l'attaque vient d'un regard, on peut détourner les yeux
  //   - attaquant : le {charId, token} de l'attaquant contre lequel le save se fait (si il y en a un)
  //   - type : le type de dégâts contre lequel on fait le save
  //   - hideSaveTitle : cache le titre du save
  //   - bonus : bonus au jet de save
  // s peut contenir:
  //   - carac : la caractéristique à utiliser pour le save
  //   - carac2 : caractéristique alternative
  //   - seuil : la difficulté du jet de sauvegarde
  //   - contact : la difficulté si la cible est au contact de options.attaquant
  //   - fauchage
  //   - entrave (pour les action qui immobilisent, ralentissent ou paralysent)
  //   - necromancie
  //   - sortilege
  //   - augmenteAvecMargeDeToucher
  function save(s, target, saveId, expliquer, options, evt, afterSave) {
    if (options.type && immuniseAuType(target, options.type, options.attaquant, options)) {
      if (!target['msgImmunite_' + options.type] && !options.silencieuxSiPasAffecte) {
        expliquer(nomPerso(target) + " ne semble pas affecté par " + stringOfType(options.type));
        target['msgImmunite_' + options.type] = true;
      }
      afterSave(true, '');
      return;
    }
    if (s.carac == 'VOL' || s.carac == 'INT' || s.carac == 'CHA' ||
      s.carac2 == 'VOL' || s.carac2 == 'INT' || s.carac2 == 'CHA') {
      if (predicateAsBool(target, 'sansEsprit')) {
        if (!options.silencieuxSiPasAffecte)
          expliquer(nomPerso(target) + " est sans esprit.");
        afterSave(true, '');
        return;
      }
      if (predicateAsBool(target, 'vegetatif')) {
        if (!options.silencieuxSiPasAffecte)
          expliquer(nomPerso(target) + " est une créature végétative.");
        afterSave(true, '');
        return;
      }
    }
    if (s.carac == 'CON' || s.carac2 == 'CON') {
      if (estNonVivant(target)) {
        if (!options.silencieuxSiPasAffecte)
          expliquer(nomPerso(target) + " n'est pas vraiment vivant.");
        afterSave(true, '');
        return;
      }
    }
    if (s.fauchage) {
      if (s.fauchage <= taillePersonnage(target, 4)) {
        expliquer(nomPerso(target) + " est trop grand pour être fauché.");
        afterSave(true, '');
        return;
      }
      if (predicateAsBool(target, 'inderacinable')) {
        expliquer(nomPerso(target) + " est indéracinable.");
        afterSave(true, '');
        return;
      }
    }
    if (s.carac == 'AGI' || s.carac2 == 'AGI') {
      if (getState(target, 'mort') || getState(target, 'assomme') ||
        getState(target, 'paralyse') || getState(target, 'endormi')) {
        if (!options.silencieuxSiPasAffecte)
          expliquer(nomPerso(target) + " n'est pas en état d'éviter l'effet.");
        afterSave(false, '');
      }
    }
    let bonus = options.bonus || 0;
    if (s.entrave && predicateAsBool(target, 'actionLibre')) {
      bonus += 5;
      expliquer("Action libre => +5 pour résister aux entraves");
    }
    let explications = [];
    explications.forEach(function(msg) {
      expliquer(nomPerso(target) + ' ' + msg);
    });
    let bonusAttrs = [];
    let bonusPreds = [];
    let seuil = s.seuil;
    if (s.contact && options.attaquant && distanceCombat(options.attaquant.token, target.token) === 0) {
      seuil = s.contact;
    }
    if (s.augmenteAvecMargeDeToucher && target.margeDeToucher && target.margeDeToucher > 0) {
      seuil += target.margeDeToucher;
    }
    if (options.regard) {
      if (getState(target, 'aveugle')) {
        expliquer(nomPerso(target) + " ne voit rien.");
        afterSave(true, '');
        return;
      }
      if (attributeAsBool(target, 'detournerLeRegard')) {
        switch (getIntValeurOfEffet(target, 'detournerLeRegard', 2)) {
          case 1:
            seuil -= 3;
            expliquer("détourne un peu le regard => -3 à la difficulté");
            break;
          case 2:
          case 3:
          case 4:
            seuil -= 6;
            expliquer("détourne le regard => -6 à la difficulté");
            break;
          default:
            expliquer(nomPerso(target) + " ferme les yeux");
            afterSave(true, '');
            return;
        }
      }
    }
    let carac = s.carac;
    //Cas où le save peut se faire au choix parmis 2 caracs
    if (s.carac2) {
      carac = meilleureCarac(carac, s.carac2, target, seuil);
    }
    if (carac == 'AGI') {
      bonusPreds.push('esquive');
    }
    if (options.sortilege) {
      bonusPreds.push('resistanceALaMagie');
    }
    if (options.type) {
      bonusPreds.push('bonusSaveContre_' + options.type);
    }
    if (!options.hideSaveTitle) {
      let title = " Jet " + deCarac(carac) + " " + seuil;
      if (options.msgPour) title += options.msgPour;
      expliquer(title);
    }
    let optionsTest = {...options
    };
    optionsTest.bonusAttrs = bonusAttrs;
    optionsTest.bonusPreds = bonusPreds;
    optionsTest.bonus = bonus;
    testCaracteristique(target, carac, seuil, saveId, optionsTest, evt,
      function(tr, explications) {
        let smsg = nomPerso(target) + " fait ";
        if (explications.length === 0) {
          smsg += tr.texte;
        } else {
          smsg += '<span title="';
          explications.forEach(function(e, i) {
            if (i > 0) smsg += "&#13;";
            smsg += e;
          });
          smsg += '">' + tr.texte + '</span>';
        }
        if (tr.reussite) {
          smsg += " => réussite";
          if (tr.reussiteAvecComplications) smsg += " partielle";
          if (options.msgReussite) smsg += options.msgReussite;
          smsg += tr.modifiers;
        } else {
          smsg += " => échec";
          if (options.msgRate) smsg += options.msgRate;
          smsg += tr.rerolls + tr.modifiers;
        }
        expliquer(smsg);
        afterSave(tr.reussite, tr.texte);
      });
  }

  function partialSave(ps, target, showTotal, dmgDisplay, total, expliquer, evt, afterSave) {
    let sav = ps.totalSave;
    let totalSave = true;
    if (sav === undefined) {
      sav = ps.partialSave;
      if (!target.eviteOuDivise) totalSave = false;
    }
    if (sav === undefined) {
      if (target.partialSaveAuto) {
        if (showTotal) dmgDisplay = '(' + dmgDisplay + ')';
        afterSave({
          succes: true,
          dmgDisplay: dmgDisplay + '/2',
          total: Math.ceil(total / 2),
          showTotal: true
        });
        return;
      }
      afterSave();
      return;
    }
    if ((sav.carac == 'CON' || sav.carac2 == 'CON') && estNonVivant(target)) {
      expliquer("Les créatures non-vivantes sont immnunisées aux attaques qui demandent un test de constitution");
      afterSave({
        succes: true,
        dmgDisplay: '0',
        total: 0,
        showTotal: false
      });
      return;
    }
    if (!totalSave && target.partialSaveAuto) {
      if (showTotal) dmgDisplay = '(' + dmgDisplay + ')';
      afterSave({
        succes: true,
        dmgDisplay: dmgDisplay + '/2',
        total: Math.ceil(total / 2),
        showTotal: true
      });
      return;
    }
    let saveOpts = {
      msgPour: " pour réduire les dégâts",
      msgReussite: ", dégâts divisés par 2",
      attaquant: ps.attaquant,
      rolls: ps.rolls,
      chanceRollId: ps.chanceRollId,
      type: ps.type,
      energiePositive: ps.energiePositive
    };
    if (totalSave) {
      saveOpts.msgPour = " pour éviter les dégâts";
      saveOpts.msgReussite = ", dégâts évités";
    }
    let saveId = 'parseSave_' + target.token.id;
    save(sav, target, saveId, expliquer, saveOpts, evt,
      function(succes, rollText) {
        if (succes && totalSave) {
          dmgDisplay = '0';
          total = 0;
        } else if (succes || target.eviteOuDivise) {
          if (showTotal) dmgDisplay = "(" + dmgDisplay + ")";
          dmgDisplay = dmgDisplay + " / 2";
          showTotal = true;
          total = Math.ceil(total / 2);
        }
        afterSave({
          succes: succes,
          dmgDisplay: dmgDisplay,
          total: total,
          showTotal: showTotal
        });
      });
  }

  //callback peut prendre en argument une structure avec les champs:
  // - texte: Le texte du jet
  // - total : Le résultat total du jet
  // - echecCritique, critique pour indiquer si 1 ou 20
  // - roll: le inlineroll
  function jetCaracteristique(personnage, carac, options, testId, evt, callback) {
    let explications = [];
    let bonusCarac = bonusTestCarac(carac, personnage, options, evt, explications);
    options.deBonus = options.deBonus || caracHeroique(carac, personnage);
    let jetCache = ficheAttributeAsBool(personnage, 'togm', false);
    let de = computeDice(personnage, options);
    let bonusText = '';
    if (bonusCarac > 0) {
      bonusText = ' + ' + bonusCarac;
    } else if (bonusCarac < 0) {
      bonusText = ' - ' + (-bonusCarac);
    }
    let plageEC = 1;
    let plageECText = '1';
    if (options && options.plageEchecCritique) {
      plageEC = options.plageEchecCritique;
      if (plageEC > 1) plageECText = '<' + plageEC;
    }
    let rollExpr = "[[" + de + "cs20cf" + plageECText + "]]";
    sendChat("", rollExpr, function(res) {
      options.rolls = options.rolls || {};
      let roll = options.rolls[testId] || res[0].inlinerolls[0];
      evt.action = evt.action || {};
      evt.action.rolls = evt.action.rolls || {};
      evt.action.rolls[testId] = roll;
      roll.token = personnage.token;
      let d20roll = roll.results.total;
      let rtext = jetCache ? d20roll + bonusCarac : buildinline(roll) + bonusText;
      let chanceUtilisee;
      if (options.chanceRollId && options.chanceRollId[testId]) {
        bonusCarac += options.chanceRollId[testId];
        rtext += "+" + options.chanceRollId[testId];
        chanceUtilisee = true;
      }
      let rt = {
        total: d20roll + bonusCarac,
        chanceUtilisee
      };
      if (d20roll <= plageEC) {
        rtext += " -> échec critique";
        rt.echecCritique = true;
      } else if (d20roll == 20) {
        rtext += " -> réussite critique";
        rt.critique = true;
      } else if (bonusCarac !== 0 && !jetCache) rtext += " = " + rt.total;
      rt.texte = rtext;
      rt.roll = roll;
      if (jetCache) sendChat('COF', "/w GM Jet caché de caractéristique : " + buildinline(roll) + bonusText);
      callback(rt, explications);
    });
  }

  function sendDisplayJetPerso(display, playerId, options) {
    if (!options.chanceRollId && stateCOF.options.affichage.val.MJ_valide_affichage_jets.val) {
      let players = findObjs({
        _type: 'player'
      });
      let joueur;
      let gm;
      let joueurJ;
      players.forEach(function(p) {
        if (!p.get('online')) return;
        if (playerId == p.id) joueurJ = p;
        if (playerIsGM(p.id)) gm = true;
        else joueur = true;
      });
      if (gm && joueur) {
        stateCOF.jetsEnCours = stateCOF.jetsEnCours || {};
        stateCOF.jetsEnCours[playerId] = {...display
        };
        addLineToFramedDisplay(display, boutonSimple('!cof-montrer-resultats-jet ' + playerId, "Montrer aux joueurs"));
        addFramedHeader(display, undefined, 'gm');
        sendFramedDisplay(display);
        if (!playerIsGM(playerId)) {
          let dest = joueurJ.get('displayname');
          if (dest.includes('"')) {
            sendChat('COF', display.action);
            log("Impossible d'envoyer des messages privés à " + dest + " car le nom contient des guillemets");
          }
          sendChat('COF', '/w "' + dest + '" ' + display.action);
        }
        return;
      }
    }
    if (display.retarde) {
      addFramedHeader(display, playerId, true);
      sendFramedDisplay(display);
      addFramedHeader(display, undefined, 'gm');
      sendFramedDisplay(display);
    } else sendFramedDisplay(display);
  }

  function jetPerso(perso, caracteristique, difficulte, titre, playerId, options = {}) {
    const evt = options.evt || {
      type: 'jetPerso',
      personnage: perso,
      action: {
        caracteristique,
        difficulte,
        titre,
        playerId,
        options
      }
    };
    addEvent(evt);
    let optionsDisplay = {
      secret: options.secret ||
        (!options.chanceRollId && stateCOF.options.affichage.val.MJ_valide_affichage_jets.val)
    };
    const display = startFramedDisplay(playerId, titre, perso, optionsDisplay);
    const testId = 'jet_' + perso.charId + '_' + caracteristique;
    if (difficulte === undefined) {
      jetCaracteristique(perso, caracteristique, options, testId, evt,
        function(rt, explications) {
          addLineToFramedDisplay(display, "<b>Résultat :</b> " + rt.texte);
          explications.forEach(function(m) {
            addLineToFramedDisplay(display, m, 80);
          });
          // Maintenant, on diminue la malédiction
          let attrMalediction = tokenAttribute(perso, 'malediction');
          if (attrMalediction.length > 0) {
            diminueMalediction(perso, evt, attrMalediction);
          }
          let boutonsReroll = '';
          if (!rt.chanceUtilisee) {
            let pc = pointsDeChance(perso);
            if (pc > 0) {
              //TODO: tester si la chance est utilisée
              boutonsReroll +=
                '<br/>' + boutonSimple("!cof2-bouton-chance " + evt.id + " " + testId, "Chance") +
                " (reste " + pc + " PC)";
            }
          }
          if (stateCOF.combat && attributeAsBool(perso, 'runeForgesort_énergie') &&
            attributeAsInt(perso, 'limiteParCombat_runeForgesort_énergie', 1) > 0 &&
            (caracteristique == 'FOR' || caracteristique == 'CON' || caracteristique == 'DEX')) {
            boutonsReroll += '<br/>' + boutonSimple("!cof-bouton-rune-energie " + evt.id + " " + testId, "Rune d'énergie");
          }
          if (stateCOF.combat && capaciteDisponible(perso, 'petitVeinard', 'combat')) {
            boutonsReroll += '<br/>' + boutonSimple("!cof-bouton-petit-veinard " + evt.id + " " + testId, "Petit veinard");
          }
          if (stateCOF.combat &&
            !rt.echecCritique && capaciteDisponible(perso, 'prouesse', 'tour') &&
            (caracteristique == 'FOR' || caracteristique == 'DEX')) {
            boutonsReroll += '<br/>' + boutonSimple("!cof-prouesse " + evt.id + " " + testId, "Prouesse");
          }
          if (caracteristique == 'FOR' && predicateAsBool(perso, 'tourDeForce')) {
            boutonsReroll += '<br/>' + boutonSimple("!cof-tour-force " + evt.id + " " + testId, "Tour De Force");
          }
          let pacteSanglant = predicateAsInt(perso, 'pacteSanglant', 0);
          if (pacteSanglant >= 3) {
            boutonsReroll += "<br/>" + boutonSimple("!cof-pacte-sanglant " + evt.id + " 3 " + testId, "Pacte sanglant (+3)");
            if (pacteSanglant >= 5) {
              boutonsReroll += "<br/>" + boutonSimple("!cof-pacte-sanglant " + evt.id + " 5 " + testId, "Pacte sanglant (+5)");
            }
          }
          addLineToFramedDisplay(display, boutonsReroll);
          sendDisplayJetPerso(display, playerId, options);
        });
    } else {
      testCaracteristique(perso, caracteristique, difficulte, testId, options, evt,
        function(tr, explications) {
          addLineToFramedDisplay(display, "<b>Résultat :</b> " + tr.texte);
          explications.forEach(function(m) {
            addLineToFramedDisplay(display, m, 80);
          });
          if (tr.reussite) {
            let msgReussite = options.messageSiSucces || "C'est réussi.";
            if (tr.reussiteAvecComplications) msgReussite += " Mais...";
            addLineToFramedDisplay(display, msgReussite + tr.modifiers);
          } else {
            let msgRate = "C'est raté." + tr.rerolls + tr.modifiers;
            addLineToFramedDisplay(display, msgRate);
          }
          sendDisplayJetPerso(display, playerId, options);
        });
    }
  }

  const nomDeCarac = {
    FOR: 'force',
    AGI: 'agilité',
    CON: 'constitution',
    PER: 'perception',
    INT: 'intelligence',
    VOL: 'volonté',
    CHA: 'charisme'
  };

  //Par construction, msg.content ne doit pas contenir d'option --competence,
  //et commencer par !cof2-jet
  function boutonsCompetences(display, perso, carac, msg, fond) {
    let action = msg.content;
    action = action.replace(/ --listeCompetences /, '');
    action = action.replace(/ --listeCompetences/, ''); //au cas où ce serait le dernier argument
    let args = action.substring(10); //on enlève !cof2-jet
    if (!args.startsWith(carac)) action = "!cof2-jet " + carac + " " + args;
    let overlay = nomDeCarac[carac];
    let charButtonStyle = ' style="border-radius:10px;" title="' + overlay + '"';
    action += ' --onlySelection ' + perso.token.id;
    let cell = boutonSimple(action, carac, charButtonStyle);
    addCellInFramedDisplay(display, cell, 60, true, fond);
    let comps = [...listeCompetences[carac].list];
    //TODO: les compétences qui viennent de la fiche. Sous forme de prédicats ?
    cell = '';
    let sec = false;
    comps.forEach(function(comp) {
      if (sec) cell += ' ';
      else sec = true;
      cell += boutonSimple(action + " --competence " + comp, comp, BS_BUTTON);
    });
    addCellInFramedDisplay(display, cell, 80, false, fond);
  }

  //!cof2-jet [carac]
  function commandeJet(msg, cmd, playerId, pageId, options) {
    let {
      selected
    } = getSelected(msg, pageId, options);
    if (selected.length === 0) {
      sendPlayer(msg, "Utilisation de !cof2-jet sans sélection de token", playerId);
      return;
    }
    if (cmd.length < 2) { //On demande la carac et la compétence, si définies dans un handout Compétence
      if (options.competence) {
        error("Il manque la caractéristique à utiliser pour la compétence " + options.nom, msg.content);
        return;
      }
      let fond = listeCompetences.nombre > 25;
      iterSelected(selected, function(perso) {
        let display = startFramedDisplay(playerId, "Jet de caractéristique", perso, {
          chuchote: true
        });
        startTableInFramedDisplay(display);
        boutonsCompetences(display, perso, 'AGI', msg);
        boutonsCompetences(display, perso, 'CON', msg, fond);
        boutonsCompetences(display, perso, 'FOR', msg);
        boutonsCompetences(display, perso, 'PER', msg, fond);
        boutonsCompetences(display, perso, 'CHA', msg);
        boutonsCompetences(display, perso, 'INT', msg, fond);
        boutonsCompetences(display, perso, 'VOL', msg);
        endTableInFramedDisplay(display);
        sendFramedDisplay(display);
      }); //fin de iterSelected
      return;
    }
    let caracteristique = cmd[1];
    if (!isCarac(caracteristique)) {
      error("Caracteristique '" + caracteristique + "' non reconnue (AGI, CON, FOR, PER, VOL, INT, CHA).", cmd);
      return;
    }
    if (options.listeCompetences && options.competence === undefined) {
      iterSelected(selected, function(perso) {
        let display = startFramedDisplay(playerId, "Jet " + deCarac(caracteristique), perso, {
          chuchote: true
        });
        addLineToFramedDisplay(display, "Choisissez la compétence");
        startTableInFramedDisplay(display);
        boutonsCompetences(display, perso, caracteristique, msg);
        endTableInFramedDisplay(display);
        sendFramedDisplay(display);
      }); //fin de iterSelected
      return;
    }
    let difficulte = options.difficulte;
    let titre = "Jet d";
    let nomJet;
    if (options.competence && options.competence.length > 0) {
      nomJet = options.competence;
    } else {
      nomJet = nomDeCarac[caracteristique];
    }
    let nj = nomJet.toLowerCase();
    switch (nj[0]) {
      case 'a':
      case 'e':
      case 'i':
      case 'o':
      case 'u':
        titre += "'<b>";
        break;
      default:
        titre += "e <b>";
    }
    titre += nomJet;
    titre += "</b>";
    if (options.bonus)
      titre += " (" + ((options.bonus > 0) ? '+' : '') + options.bonus + ")";
    if (difficulte !== undefined) titre += " difficulté " + difficulte;
    iterSelected(selected, function(perso) {
      jetPerso(perso, caracteristique, difficulte, titre, playerId, options);
    });
  }

  function commandeJetChance(msg, cmd, playerId, pageId, options) {
    let {
      selected
    } = getSelected(msg, pageId, options);
    if (selected.length === 0) {
      sendPlayer(msg, "Utilisation de !cof2-jet-chance sans sélection de token", playerId);
      return;
    }
    let display;
    let opt = {
      deExplosif: true
    };
    let tousLesJets = [];
    iterSelected(selected, function(perso) {
      opt.bonus = ficheAttributeAsInt(perso, 'pc', 0);
      let jet = rollDePlus(6, opt);
      if (!display) {
        if (selected.length < 2) {
          display = startFramedDisplay(playerId, "Jet de chance", perso, options);
          addLineToFramedDisplay(display, jet.roll);
        } else {
          display = startFramedDisplay(playerId, "Jet de chance");
          startTableInFramedDisplay(display);
          tousLesJets = [{
            jet,
            nom: nomPerso(perso)
          }];
        }
      } else {
        tousLesJets.push({
          jet,
          nom: nomPerso(perso)
        });
      }
    });
    if (selected.length > 1) {
      tousLesJets.sort(function(j1, j2) {
        return j1.jet.val - j2.jet.val;
      });
      let fond = false;
      tousLesJets.forEach(function(j) {
        addCellInFramedDisplay(display, j.nom, 100, true, fond);
        addCellInFramedDisplay(display, j.jet.roll, 100, false, fond);
        fond = !fond;
      });
      endTableInFramedDisplay(display);
    }
    sendFramedDisplay(display);
  }

  // Le son -------------------------------------------------------------

  function playSound(sound) {
    let AMdeclared;
    try {
      AMdeclared = Roll20AM;
    } catch (e) {
      if (e.name != "ReferenceError") throw (e);
    }
    if (AMdeclared) {
      //With Roll20 Audio Master
      sendChat("GM", "!roll20AM --audio,play,nomenu|" + sound);
    } else {
      let jukebox = findObjs({
        type: 'jukeboxtrack',
        title: sound
      });
      jukebox.forEach(function(track) {
        track.set({
          playing: true,
          softstop: false
        });
      });
    }
  }


  // Tokens temporaires ----------------------------------------------------------

  function dmExplosion(id, effet) {
    let action = "!cof2-dmg " + effet.dm + " --disque " + id + " " + effet.portee;
    if (effet.typeBombe == 'piege') action += " --psave AGI 15";
    sendChat('', action);
  }

  function getTokenTemp(tt, pageId) {
    let token = getObj('graphic', tt.tid);
    if (!token) {
      if (!tt.name) return;
      let f = {
        _type: 'graphic',
        name: tt.name
      };
      if (pageId) f._pageid = pageId;
      token = findObjs(f);
      if (token.length === 0) return;
      token = token[0];
    }
    return token;
  }

  //Peut faire des effets asynchrones
  function deleteTokenTemp(tt, evt) {
    let token = getTokenTemp(tt);
    if (!token) return;
    if (!tt.pasDExplosion) {
      let gmNotes = token.get('gmnotes');
      try {
        if (gmNotes.startsWith('{')) {
          let effet = JSON.parse(gmNotes);
          //{typeBombe, portee, message, dm, tempsDePose, duree, intrusion}
          if (effet && effet.typeBombe) {
            let pageId = token.get('pageid');
            if (effet.message) sendChat('', effet.message);
            let left = token.get('left');
            let top = token.get('top');
            spawnFx(left, top, 'explode-fire', pageId);
            playSound('Explosion');
            if (effet.dm) {
              let charCible = trouveOuCreeCible();
              if (charCible) {
                charCible.get('_defaulttoken', function(normalToken) {
                  if (normalToken === '') {
                    dmExplosion(tt.id, effet);
                    return;
                  }
                  normalToken = JSON.parse(normalToken);
                  normalToken._pageid = pageId;
                  normalToken.left = left;
                  normalToken.top = top;
                  normalToken.imgsrc = normalizeTokenImg(normalToken.imgsrc);
                  let tokenCible = createObj('graphic', normalToken);
                  if (tokenCible) dmExplosion(tokenCible.id, effet);
                  else {
                    error("Impossible de créer le token cible", normalToken);
                    dmExplosion(tt.id, effet);
                  }
                });
              } else dmExplosion(tt.id, effet);
            }
          }
        }
      } catch (parseError) {}
    }
    let ett = {...tt
    };
    ett.deletedToken = getTokenFields(token);
    evt.deletedTokensTemps = evt.deletedTokensTemps || [];
    evt.deletedTokensTemps.push(ett);
    token.remove();
  }

  // Initiative ----------------------------------------------------------

  //asynchrone
  // effet est le nom complet de l'effet
  function degatsParTour(charId, pageId, effet, attrName, dmg, type, msg, evt, options, callback) {
    options = options || {};
    let count;
    iterTokensOfAttribute(charId, pageId, effet, attrName,
      function(token, total) {
        if (count === undefined) count = {
          v: total
        };
        let perso = {
          token,
          charId
        };
        if (getState(perso, 'mort')) {
          if (callback) callback();
          return;
        }
        if (options.save) {
          let playerId = getPlayerIds(perso);
          let nameEffet = effet;
          if (effet.startsWith('dotGen('))
            nameEffet = effet.substring(7, effet.indexOf(')'));
          let display = startFramedDisplay(playerId, "Effet de " + nameEffet, perso);
          let saveId = "degatsParTour_" + effet + "_" + token.id;
          let expliquer = function(m) {
            addLineToFramedDisplay(display, m);
          };
          let msgPour = " pour ne pas prendre de dégâts de " + nameEffet;
          let sujet = onGenre(perso, 'il', 'elle');
          let msgReussite = ", " + sujet + " ne perd pas de PV ce tour";
          let saveOpts = {
            msgPour: msgPour,
            msgReussite: msgReussite,
            rolls: options.rolls,
            chanceRollId: options.chanceRollId,
            type: type
          };
          save(options.save, perso, saveId, expliquer, saveOpts, evt, function(reussite, texte) {
            if (reussite) {
              sendFramedDisplay(display);
              return;
            }
            rollAndDealDmg(perso, dmg, type, effet, attrName, msg, count, evt, options, callback, display);
          });
          return;
        }
        rollAndDealDmg(perso, dmg, type, effet, attrName, msg, count, evt, options, callback);
      }); //fin iterTokensOfAttribute
  }

  //asynchrone
  function soigneParTour(charId, pageId, effet, attrName, soinsExpr, msg, evt, options, callback) {
    options = options || {};
    msg = msg || '';
    let count = -1;
    iterTokensOfAttribute(charId, pageId, effet, attrName,
      function(token, total) {
        if (count < 0) count = total;
        const perso = {
          token: token,
          charId: charId
        };
        let tdmi = attributeAsInt(perso, effet + "TempeteDeManaIntense", 0);
        if (tdmi) {
          soinsExpr = "(" + soinsExpr + ")*" + (1 + tdmi);
          removeTokenAttr(perso, effet + "TempeteDeManaIntense", evt);
        }
        let localSoinsExpr = soinsExpr;
        if (options.valeur) {
          let attrsVal = tokenAttribute(perso, options.valeur);
          if (attrsVal.length > 0) localSoinsExpr = attrsVal[0].get('current');
        }
        sendChat('', "[[" + localSoinsExpr + "]]", function(res) {
          let rolls = res[0];
          let soinRoll = rolls.inlinerolls[0];
          let soins = soinRoll.results.total;
          let displaySoins = buildinline(soinRoll, 'normal', true);
          soigneToken(perso, soins, evt,
            function(s) {
              if (s < soins) sendPerso(perso, "récupère tous ses PV.");
              else sendPerso(perso, "récupère " + displaySoins + " PV.");
              count--;
              if (count === 0) callback();
            },
            function() {
              count--;
              if (count === 0) callback();
            });
        }); //fin sendChat du jet de dé
      }); //fin iterTokensOfAttribute
  }

  function getInit() {
    let combat = stateCOF.combat;
    if (!combat) return 1000;
    return combat.init;
  }

  //retourne l'id du suivant si le token actuel était en tête de liste
  function removeFromTurnTracker(perso, evt) {
    let tokenId = perso.token.id;
    let turnOrder = Campaign().get('turnorder');
    if (turnOrder === '' || !stateCOF.combat) {
      return;
    }
    evt.turnorder = evt.turnorder || turnOrder;
    turnOrder = JSON.parse(turnOrder);
    if (turnOrder.length === 0) return;
    let res;
    let change;
    if (turnOrder[0].id == tokenId) {
      change = true;
      if (turnOrder.length > 1) {
        res = {
          nextId: turnOrder[1].id
        };
        turnOrder.shift();
        if (turnOrder[0].id == "-1" && turnOrder[0].custom == "Tour") {
          //Il faut aussi augmenter la valeur du tour
          let tour = parseInt(turnOrder[0].pr);
          if (isNaN(tour)) {
            error("Tour invalide", turnOrder);
            return;
          }
          turnOrder[0].pr = tour + 1;
        }
        let cmp = Campaign();
        cmp.set('turnorder', JSON.stringify(turnOrder));
        nextTurn(cmp, evt);
        return res;
      } else {
        res = {
          nextId: false
        };
        turnOrder = [];
      }
    } else {
      turnOrder = turnOrder.filter(
        function(elt) {
          let f = elt.id == tokenId;
          change = change || f;
          return !f;
        });
    }
    if (change) Campaign().set('turnorder', JSON.stringify(turnOrder));
    return res;
  }

  //Calcul l'initiative d'un personnage
  function persoInit(perso, evt, already) {
    let init;
    init = ficheAttributeAsInt(perso, 'init', 10, optTransforme);
    return init;
  }

  function getTurnOrder(combat, evt) {
    let turnOrder = Campaign().get('turnorder');
    evt.turnorder = evt.turnorder || turnOrder;
    if (turnOrder === '') {
      turnOrder = [{
        id: "-1",
        pr: 1,
        custom: "Tour",
        formula: "+1"
      }];
      if (!evt.combat) evt.combat = {...combat
      };
      combat.tour = 1;
    } else {
      turnOrder = JSON.parse(turnOrder);
    }
    let indexTour = turnOrder.findIndex(function(elt) {
      return (elt.id == "-1" && elt.custom == "Tour");
    });
    if (indexTour == -1) {
      indexTour = turnOrder.length;
      turnOrder.push({
        id: "-1",
        pr: 1,
        custom: "Tour",
        formula: "+1"
      });
      if (!evt.combat) evt.combat = {...combat
      };
      combat.tour = 1;
    }
    let res = {
      tour: turnOrder[indexTour],
      pasAgi: turnOrder.slice(0, indexTour),
      dejaAgi: turnOrder.slice(indexTour + 1, turnOrder.length)
    };
    return res;
  }

  function updateInit(token, evt) {
    if (stateCOF.combat &&
      token.get('pageid') == stateCOF.combat.pageId)
      initiative([token.id], evt, true);
  }

  function updateNextInit(perso) {
    updateNextInitSet.add(perso.token.id);
  }

  function removeActiveStatus() {
    if (stateCOF.options.affichage.val.init_dynamique.val) {
      removeRoundMarker();
      delete stateCOF.roundMarkerId;
    }
  }

  function setActiveToken(combat, tokenId, evt) {
    let pageId, activeTokenId;
    if (combat) {
      pageId = combat.pageId;
      activeTokenId = combat.activeTokenId;
    }
    if (activeTokenId) {
      if (tokenId == activeTokenId) return;
      if (!evt.combat) evt.combat = {...stateCOF.combat
      };
      removeActiveStatus();
    }
    if (tokenId) {
      let perso = persoOfId(tokenId, tokenId);
      if (perso) {
        if (stateCOF.options.affichage.val.init_dynamique.val) {
          threadSync++;
          activateRoundMarker(threadSync, perso.token);
        }
        combat.activeTokenId = tokenId;
        combat.activeTokenName = perso.token.get('name');
        turnAction(perso);
      } else {
        error("Impossible de trouver le token dont c'est le tour", tokenId);
        combat.activeTokenId = undefined;
      }
    } else combat.activeTokenId = undefined;
  }

  function setTurnOrder(to, evt) {
    if (to.pasAgi.length > 0) {
      to.pasAgi.sort(function(a, b) {
        if (a.id == "-1") return 1;
        if (b.id == "-1") return -1;
        if (a.pr < b.pr) return 1;
        if (b.pr < a.pr) return -1;
        // Priorité aux plus hauts niveaux
        let persoA = persoOfId(a.id);
        if (!persoA) return;
        let persoB = persoOfId(b.id);
        if (!persoB) return;
        let niveauA = ficheAttributeAsInt(persoA, 'niveau', 1);
        let niveauB = ficheAttributeAsInt(persoB, 'niveau', 1);
        if (niveauA < niveauB) return 1;
        if (niveauB < niveauA) return -1;
        // Priorité aux joueurs
        if (estPJ(persoA)) {
          if (!estPJ(persoB)) return -1;
        } else if (estPJ(persoB)) return 1;
        //Au final, on départage avec l'agi.
        let agiA = modCarac(persoA, 'agi');
        let agiB = modCarac(persoB, 'agi');
        if (agiA < agiB) return 1;
        if (agiA > agiB) return -1;
        return 0;
      });
      setActiveToken(stateCOF.combat, to.pasAgi[0].id, evt);
    }
    to.pasAgi.push(to.tour);
    let turnOrder = to.pasAgi.concat(to.dejaAgi);
    Campaign().set('turnorder', JSON.stringify(turnOrder));
  }

  //options: recompute : si pas encore agi, on remet à sa place dans le turn order
  //already est là pour éviter les récursions infinies
  // Toujours appelé quand on entre en combat
  // Initialise le compteur de tour, si besoin
  // Suppose que tous les tokens qui n'ont pas encore agi sont ceux avant le compteur de tour
  // Quand on lance l'initiative sur un token non présent dans le turnOrder, on suppose qu'il n'a pas encore agi.
  // S'il est déjà présent, il reste dans le même groupe, mais on met à jour sa position dans le groupe
  // Les tokens avant le tour sont triés
  function initiative(selected, evt, recompute = false, already = false) {
    if (!Campaign().get('initiativepage')) evt.initiativepage = false;
    let debutCombat = false;
    if (!stateCOF.combat) { //actions de début de combat
      evt.combat = false;
      stateCOF.combat = {
        tour: 1,
        init: 1000
      };
      Campaign().set({
        turnorder: JSON.stringify([{
          id: "-1",
          pr: 1,
          custom: "Tour",
          formula: "+1"
        }]),
        initiativepage: true
      });
      debutCombat = true;
    }
    const combat = stateCOF.combat;
    if (!Campaign().get('initiativepage')) {
      Campaign().set('initiativepage', true);
    }
    let to = getTurnOrder(combat, evt);
    if (to.pasAgi.length === 0) { // Fin de tour, on met le tour à la fin et on retrie
      to.pasAgi = to.dejaAgi;
      to.dejaAgi = [];
    }
    let tokens;
    let aAjouter = [];
    iterSelected(selected, function(perso) {
      let pageId = perso.token.get('pageid');
      combat.pageId = pageId;
      if (!isActive(perso)) return;
      let init = persoInit(perso, evt);
      // On place le token à sa place dans la liste du tour
      let dejaIndex =
        to.dejaAgi.findIndex(function(elt) {
          return (elt.id == perso.token.id);
        });
      if (dejaIndex == -1) { //Le personnage doit encore agir
        let push = true;
        to.pasAgi =
          to.pasAgi.filter(function(elt) {
            if (elt.id == perso.token.id) {
              if (recompute && elt.pr != init) {
                if (elt.pr == combat.init && init > elt.pr) {
                  //Pour l'instant, on ne peut pas remonter l'init, on le fera au prochain tour
                  push = false;
                  updateNextInit(perso);
                  return true;
                } else {
                  return false; //On enlève le perso des pasAgi
                }
              }
              push = false; //Sinon, comme on ne recalcule pas, on le laisse
              return true;
            }
            return true;
          });
        if (push) {
          if (init >= combat.init) { //On ne peut pas remonter le temps.
            init = combat.init - 1;
            updateNextInit(perso);
          }
          to.pasAgi.push({
            id: perso.token.id,
            _pageid: pageId,
            pr: init,
            custom: ''
          });
          if (!recompute) { //Alors on vient d'ajouter le perso au combat
            //Les effets quand on entre en combat
            if (predicateAsBool(perso, 'embuscade')) {
              let diffSurprise = 15 + modCarac(perso, 'agi');
              let commande = "!cof-surprise " + diffSurprise + " --target @{target|token_id}";
              sendPerso(perso, "peut faire une " + boutonSimple(commande, 'embuscade'), true);
            }
            //Les autres persos qui entrent en combat en même temps
            let ajouterEnCombat = predicatesNamed(perso, 'entrerEnCombatAvec');
            if (ajouterEnCombat.length > 0) {
              let aec = new Set(ajouterEnCombat);
              tokens = tokens || findObjs({
                _type: 'graphic',
                _pageid: pageId,
                layer: 'objects'
              });
              if (!already) {
                already = new Set(selected);
              }
              tokens.forEach(function(tok) {
                let ci = tok.get('represents');
                if (!ci) return;
                if (!aec.has(tok.get('name'))) return;
                if (already.has(tok.id)) return;
                aAjouter.push(tok.id);
                already.add(tok.id);
              });
            }
          }
        }
      } else {
        to.dejaAgi[dejaIndex].pr = init;
      }
    });
    setTurnOrder(to, evt);
    if (aAjouter.length > 0) initiative(aAjouter, evt, false, already);
    return combat;
  }

  //!cof2-init
  function commandeInit(msg, cmd, playerId, pageId, options) {
    let {
      selected
    } = getSelected(msg, pageId, options);
    if (selected === undefined || selected.length === 0) {
      sendPlayer(msg, "Dans !cof2-init : rien à faire, pas de token selectionné", playerId);
      return;
    }
    const evt = {
      type: 'initiative'
    };
    addEvent(evt);
    //TODO: gérer la règle d'initiative variable
    initiative(selected, evt);
  }

  const armeDeJetRegExpr = new RegExp(/^repeating_(armes|npcarmes)_[^_]*_jet-dispo$/);

  function recupererArmesDeJet(attrs, evt) {
    let msgAffiche = new Set();
    attrs.forEach(function(a) {
      const nom = a.get('name');
      if (!armeDeJetRegExpr.test(nom)) return;
      const charId = a.get('characterid');
      let m = parseInt(a.get('max'));
      let n = parseInt(a.get('current'));
      if (isNaN(m) || m < 0) {
        if (isNaN(n) || n < 0) {
          error("Erreur dans les quantités d'arme de jet", a);
          a.remove();
          return;
        }
        m = n;
      }
      if (isNaN(n) || n < m) {
        evt.attributes.push({
          attribute: a,
          current: n,
          max: m
        });
        if (!msgAffiche.has(charId)) {
          msgAffiche.add(charId);
          whisperChar(charId, "récupère ses armes de jet");
        }
        a.set('current', m);
      }
    });
  }

  const couleurType = {
    'normal': {
      background: '#F1E6DA',
      color: '#000'
    },
    'magique': {
      background: '#FFFFFF',
      color: '#534200'
    },
    'maladie': { //Pour l'instant, comme normal
      background: '#F1E6DA',
      color: '#000'
    },
    'feu': {
      background: '#FF3011',
      color: '#440000'
    },
    'froid': {
      background: '#77FFFF',
      color: '#004444'
    },
    'acide': {
      background: '#80BF40',
      color: '#020401'
    },
    'sonique': {
      background: '#E6CCFF',
      color: '#001144'
    },
    'electrique': {
      background: '#FFFF80',
      color: '#222200'
    },
    'poison': {
      background: '#5A752F',
      color: '#DDDDAA'
    },
    'argent': {
      background: '#F1E6DA',
      color: '#C0C0C0'
    },
    'drain': {
      background: '#0D1201',
      color: '#E8F5C9'
    },
    'energie': {
      background: '#FFEEAA',
      color: '#221100'
    },
  };

  // options: bonus:int, deExplosif:bool, nbDes:int, type, maxResult
  //      resultatDesSeuls (rempli par la fonction si true)
  //Renvoie 1dk + bonus, avec le texte
  //champs val et roll
  //de peut être un nombre > 0 ou bien le résultat de parseDice
  function rollDePlus(de, options = {}) {
    let nbDes = options.nbDes || 1;
    let bonus = options.bonus || 0;
    if (de.dice !== undefined) {
      nbDes = options.nbDes || de.nbDe;
      bonus = options.bonus || de.bonus || 0;
      if (!nbDes) {
        return {
          val: bonus,
          roll: '' + bonus
        };
      }
      de = de.dice;
    }
    let count = nbDes;
    let explose = options.deExplosif || false;
    let texteJetDeTotal = '';
    let jetTotal = 0;
    do {
      let jetDe = randomInteger(de);
      if (options.maxResult) jetDe = de;
      texteJetDeTotal += jetDe;
      jetTotal += jetDe;
      explose = explose && (jetDe === de);
      if (explose) {
        texteJetDeTotal += ',';
      } else {
        count--;
        if (count > 0) {
          texteJetDeTotal += ',';
        }
      }
    } while ((explose || count > 0) && jetTotal < 1000);
    if (options.resultatDesSeuls) options.resultatDesSeuls = jetTotal;
    let res = {
      val: jetTotal + bonus
    };
    let style = 'display: inline-block; border-radius: 5px; padding: 0 4px;';
    let type = options.type || 'normal';
    let couleurs = couleurType[type];
    if (couleurs === undefined) couleurs = couleurType.normal;
    style += ' background-color: ' + couleurs.background + ';';
    style += ' color: ' + couleurs.color + ';';
    let msg = '<span style="' + style + '"';
    msg += ' title="' + nbDes + 'd' + de;
    if (options.deExplosif) msg += '!';
    if (bonus > 0) {
      msg += '+' + bonus;
      texteJetDeTotal += '+' + bonus;
    } else if (bonus < 0) {
      msg += bonus;
      texteJetDeTotal += bonus;
    }
    msg += ' = ' + texteJetDeTotal + '" class="a inlinerollresult showtip tipsy-n">';
    msg += res.val + "</span>";
    res.roll = msg;
    return res;
  }

  //parse les expressions du type 3d6+4
  //renvoie un structure avec les champs nbDe, dice et bonus
  function parseDice(expr, msg) {
    let dm = {
      nbDe: 0,
      dice: 4,
      bonus: 0,
      id: generateRowID()
    };
    let exprDM = expr.trim().toLowerCase();
    let indexD = exprDM.indexOf('d');
    if (indexD > 0) {
      dm.nbDe = parseInt(exprDM.substring(0, indexD));
      if (isNaN(dm.nbDe) || dm.nbDe < 0) {
        if (msg)
          error("Expression de " + msg + ' ' + exprDM + " mal formée", expr);
        return;
      }
      exprDM = exprDM.substring(indexD + 1);
      indexD = exprDM.search(/[+\-]/);
      if (indexD <= 0) {
        dm.dice = parseInt(exprDM);
        if (isNaN(dm.dice) || dm.dice < 1) {
          if (msg)
            error("Nombre de faces incorrect dans l'expression de " + msg, expr);
          return;
        }
        return dm;
      }
      exprDM = exprDM.replace('+-', '-');
      dm.dice = parseInt(exprDM.substring(0, indexD));
      if (isNaN(dm.dice) || dm.dice < 1) {
        if (msg)
          error("Nombre de faces incorrect dans l'expression de " + msg, expr);
        return;
      }
      exprDM = exprDM.substring(indexD).trim();
    }
    dm.bonus = parseInt(exprDM);
    if (isNaN(dm.bonus)) {
      if (msg)
        error("Expression de " + msg + " incorrecte", expr);
      return;
    }
    return dm;
  }

  function getGMId() {
    let gm = findObjs({
      _type: 'player'
    }).find(function(p) {
      return playerIsGM(p.id);
    });
    if (!gm) {
      error("Impossible de trouver un MJ");
      return;
    }
    return gm.id;
  }

  // gestion des effets qui se déclenchent à la fin de chaque tour
  // TODO: vérifier si on a besoin d'options
  // Asynchrone (à cause des saves par tour)
  function changementDeTour(tour, attrs, evt, combat, pageId, options = {}) {
    // Enlever les bonus d'un tour
    attrs = removeAllAttributes('limiteParTour', evt, attrs);
    // Pour défaut dans la cuirasse, on diminue si la valeur est 2, et on supprime si c'est 1
    let defautsDansLaCuirasse = allAttributesNamed(attrs, 'defautDansLaCuirasse');
    defautsDansLaCuirasse.forEach(function(attr) {
      if (attr.get('current') < 2) {
        if (evt.deletedAttributes) evt.deletedAttributes.push(attr);
        else evt.deletedAttributes = [attr];
        attr.remove();
      } else {
        let prevAttr = {
          attribute: attr,
          current: 2
        };
        evt.attributes.push(prevAttr);
        attr.set('current', 1);
      }
    });
    // Pour la feinte, on augmente la valeur, et on supprime si la valeur est 2
    let feinte = allAttributesNamed(attrs, 'feinte');
    feinte.forEach(function(attr) {
      let valFeinte = parseInt(attr.get('current'));
      if (isNaN(valFeinte) || valFeinte > 0) {
        evt.deletedAttributes.push(attr);
        attr.remove();
      } else {
        let prevAttr = {
          attribute: attr,
          current: 0
        };
        evt.attributes.push(prevAttr);
        attr.set('current', 1);
      }
    });
    // nouveau tour : enlever le statut surpris
    // et faire les actions de début de tour
    let selected = [];
    updateNextInitSet.forEach(function(id) {
      selected.push(id);
    });
    let allTokens = findObjs({
      _type: 'graphic',
      _subtype: 'token',
      _pageid: pageId,
      layer: 'objects'
    });
    let allPersos = [];
    allTokens.forEach(function(token) {
      let charId = token.get('represents');
      if (charId === '') return;
      let c = getObj('character', charId);
      if (c === undefined) {
        token.remove();
        return;
      }
      allPersos.push({
        token,
        charId
      });
    });
    allPersos.forEach(function(perso) {
      if (getState(perso, 'surpris')) { //surprise
        setState(perso, 'surpris', false, {});
        selected.push(perso.token.id);
      }
      if (getState(perso, 'enseveli')) {
        let degats = rollDePlus(6, {
          nbDes: 2
        });
        let dmg = {
          type: 'magique',
          total: degats.val,
          display: degats.roll
        };
        dealDamage(perso, dmg, [], evt, false, {}, undefined,
          function(dmgDisplay, dmgFinal) {
            sendPerso(perso, " est écrasé ! " +
              onGenre(perso, 'Il', 'Elle') + " subit " + dmgDisplay + " DM");
          });
      }
      let enflammeAttr = tokenAttribute(perso, 'enflamme');
      if (enflammeAttr.length > 0) {
        let enflamme = parseInt(enflammeAttr[0].get('current'));
        // Pour ne pas faire les dégâts plusieurs fois (plusieurs tokens pour un même personnage), on utilise la valeur max de l'attribut
        let dernierTourEnflamme = parseInt(enflammeAttr[0].get('max'));
        if ((isNaN(dernierTourEnflamme) || dernierTourEnflamme < tour) &&
          !isNaN(enflamme) && enflamme > 0) {
          let optFlammes = {
            resultatDesSeuls: true,
            bonus: enflamme - 1
          };
          let {
            val,
            roll
          } = rollDePlus(6, optFlammes);
          let d6Enflamme = optFlammes.resultatDesSeuls;
          let dmgEnflamme = {
            type: 'feu',
            total: val,
            display: roll
          };
          if (getState(perso, 'mort')) {
            sendChat('', "Le cadavre de " + nomPerso(perso) + " continue de brûler");
          } else {
            dealDamage(perso, dmgEnflamme, [], evt, false, {}, undefined,
              function(dmgDisplay, dmgFinal) {
                sendPerso(perso, " est en flamme ! " +
                  onGenre(perso, 'Il', 'Elle') + " subit " + dmgDisplay + " DM");
              });
          }
          if (d6Enflamme < 3) {
            sendPerso(perso, ": les flammes s'éteignent");
            removeTokenAttr(perso, 'enflamme', evt);
            let ms = messageEffetCombat.enflamme.statusMarker;
            if (ms) {
              affectToken(perso.token, 'statusmarkers', perso.token.get('statusmarkers'), evt);
              perso.token.set('status_' + ms, false);
            }
          } else {
            enflammeAttr[0].set('max', tour);
          }
        }
      }
      if (attributeAsBool(perso, 'estGobePar') && !getState(perso, 'mort')) {
        let jet = rollDePlus(6, {
          nbDes: 3
        });
        let dmg = {
          type: 'normal', //correspond à de l'asphyxie
          total: jet.val,
          display: jet.roll
        };
        if (immuniseAsphyxie(perso)) dmg.type = 'acide';
        dealDamage(perso, dmg, [], evt, false, {}, undefined,
          function(dmgDisplay, dmgFinal) {
            sendPerso(perso, "est en train d'être digéré. " + onGenre(perso, 'Il', 'Elle') + " perd " + dmgDisplay + " PVs");
          });
      }
      if (attributeAsBool(perso, 'blessureQuiSaigne') &&
        !getState(perso, 'mort') && !immuniseAuxSaignements(perso)) {
        let bonus = getIntValeurOfEffet(perso, 'blessureQuiSaigne', 0);
        let jetSaignement = rollDePlus(6, {
          bonus
        });
        let dmgSaignement = {
          type: 'normal',
          total: jetSaignement.val,
          display: jetSaignement.roll
        };
        let optDMSaignements = getEffectOptions(perso, 'blessureQuiSaigne');
        perso.ignoreTouteRD = true;
        dealDamage(perso, dmgSaignement, [], evt, false, optDMSaignements, undefined,
          function(dmgDisplay, dmgFinal) {
            sendPerso(perso, "saigne. " + onGenre(perso, 'Il', 'Elle') + " perd " + dmgDisplay + " PVs");
          });
      }
      let vitaliteSurnaturelle = predicateAsBool(perso, 'vitaliteSurnaturelle');
      if (vitaliteSurnaturelle) {
        let indexType = vitaliteSurnaturelle.indexOf('/');
        let vitaliteSurnat = vitaliteSurnaturelle;
        if (indexType > 0)
          vitaliteSurnat = vitaliteSurnat.substring(0, indexType);
        vitaliteSurnat = vitaliteSurnat.trim();
        let regenereMemeMort;
        if ((vitaliteSurnat + '').endsWith('+')) {
          vitaliteSurnat = vitaliteSurnat.substr(0, vitaliteSurnat.length - 1);
          regenereMemeMort = true;
        }
        if (regenereMemeMort || !getState(perso, 'mort')) {
          vitaliteSurnat = parseInt(vitaliteSurnat);
          if (vitaliteSurnat > 0) {
            let saufDMType;
            if (indexType > 0 && indexType < vitaliteSurnaturelle.length - 1)
              saufDMType = vitaliteSurnaturelle.substring(indexType + 1).split(',');
            soigneToken(perso, vitaliteSurnat, evt,
              function(s) {
                whisperChar(perso.charId, 'récupère ' + s + ' PVs.');
              },
              function() {}, {
                saufDMType
              }
            );
          }
        }
      }
      if (attributeAsBool(perso, 'sangDeLArbreCoeur') && !getState(perso, 'mort')) {
        soigneToken(perso, 5, evt,
          function(s) {
            whisperChar(perso.charId, "régénère " + s + " PVs. (grâce à la potion de sang de l'Arbre Coeur)");
          },
          function() {}
        );
      }
      let increvableActif = tokenAttribute(perso, 'increvableActif');
      if (increvableActif.length > 0) {
        increvableActif[0].remove();
        let soins = randomInteger(6) + randomInteger(6) + randomInteger(6) + modCarac(perso, 'constitution');
        soigneToken(perso, soins, evt, function(soinsEffectifs) {
          let msgSoins = "est increvable et récupère ";
          if (soinsEffectifs == soins) msgSoins += soins + " points de vie";
          else msgSoins += soinsEffectifs + " PV (le jet était " + soins + ")";
          whisperChar(perso.charId, msgSoins);
        });
      }
      let degradationZombie = attributeAsInt(perso, 'degradationZombie', -1);
      if (degradationZombie % 6 === 0) {
        let r = {
          total: 1,
          type: 'normal',
          display: 1
        };
        perso.ignoreTouteRD = true;
        dealDamage(perso, r, [], evt, false, {}, [], function() {
          // Vérification si le Zombie est toujours vivant
          let token = getObj('graphic', perso.token.id);
          if (token) whisperChar(perso.charId, "se dégrade et perd 1 PV");
        });
      }
    });
    setActiveToken(combat, undefined, evt);
    initiative(selected, evt, true); // met Tour à la fin et retrie
    updateNextInitSet = new Set();
    // Saves à faire à la fin de chaque tour. Asynchrone, mais pas grave ?
    attrs.forEach(function(attr) {
      let attrName = attr.get('name');
      let indexSave = attrName.indexOf('SaveParTour');
      if (indexSave < 0) return;
      let indexSaveType = attrName.indexOf('SaveParTourType');
      if (indexSaveType > 0) return;
      let effetC = attrName.substring(0, indexSave);
      let effetTemp = estEffetTemp(effetC);
      if (!cof_states[effetC] && !effetTemp && !estEffetCombat(effetC)) return;
      let carac = attr.get('current');
      if (!isCarac(carac)) {
        error("Save par tour " + attrName + " mal formé", carac);
        return;
      }
      let seuil = parseInt(attr.get('max'));
      if (isNaN(seuil)) {
        error("Save par tour " + attrName + " mal formé", seuil);
        return;
      }
      let charId = attr.get('characterid');
      attrName = effetC + attrName.substr(indexSave + 11);
      let token;
      iterTokensOfAttribute(charId, pageId, effetC, attrName, function(tok) {
        if (token === undefined) token = tok;
      });
      if (token === undefined) {
        log("Pas de token pour le save " + attrName);
        return;
      }
      const perso = {
        token: token,
        charId: charId
      };
      if (getState(perso, 'mort')) {
        return;
      }
      let expliquer = function(msg) {
        sendPerso(perso, msg);
      };
      let met;
      if (effetTemp) met = messageOfEffetTemp(effetC);
      else if (cof_states[effetC]) {
        let se = stringOfEtat(effetC, perso);
        met = {
          etat: true,
          msgSave: "ne plus être " + se,
          fin: "n'est plus " + se,
          actif: "est toujours " + se
        };
      } else met = messageEffetCombat[effetC];
      let msgPour = " pour ";
      if (met.msgSave) msgPour += met.msgSave;
      else {
        msgPour += "ne plus être sous l'effet de ";
        if (effetC.startsWith('dotGen('))
          msgPour += effetC.substring(7, effetC.indexOf(')'));
        else msgPour += effetC;
      }
      let sujet = onGenre(perso, 'il', 'elle');
      let msgReussite = ", " + sujet + ' ' + messageFin(perso, met, effetC);
      let msgRate = ", " + sujet + ' ' + messageActif(perso, met, effetC);
      let saveOpts = {
        msgPour: msgPour,
        msgReussite: msgReussite,
        msgRate: msgRate,
        rolls: options.rolls,
        chanceRollId: options.chanceRollId
      };
      let attrType = findObjs({
        _type: 'attribute',
        _characterid: charId,
        name: attr.get('name').replace('SaveParTour', 'SaveParTourType')
      });
      if (attrType.length > 0) {
        saveOpts.type = attrType[0].get('current');
      }
      let attrEffet;
      if (met.etat) {
        attrEffet = {
          id: effetC
        };
      } else {
        attrEffet = findObjs({
          _type: 'attribute',
          _characterid: charId,
          name: attrName
        });
        if (attrEffet === undefined || attrEffet.length === 0) {
          if (getObj('attribute', attr.id)) {
            error("Save sans effet " + attrName, attr);
            findObjs({
              _type: 'attribute',
              _characterid: charId,
              name: attr.get('name').replace('SaveParTour', 'SaveParTourType')
            }).forEach(function(a) {
              a.remove();
            });
            attr.remove();
          }
          return;
        }
        attrEffet = attrEffet[0];
      }
      let saveId = 'saveParTour_' + attrEffet.id + '_' + perso.token.id;
      let s = {
        carac: carac,
        seuil: seuil,
        entrave: met.entrave
      };
      save(s, perso, saveId, expliquer, saveOpts, evt,
        function(reussite, texte) { //asynchrone
          if (reussite) {
            if (met.etat) {
              setState(perso, effetC, false, evt);
            } else {
              let eff = effetC;
              if (effetTemp) eff = effetTempOfAttribute(attrEffet);
              finDEffet(attrEffet, eff, attrName, charId, evt, {
                attrSave: attr,
                pageId: pageId
              });
            }
          }
        });
    }); //fin boucle attrSave
    let armeesDesMorts = allAttributesNamed(attrs, 'armeeDesMorts');
    let degatsArmeeFull = {};
    let degatsArmeeDefense = {};
    let gmId;
    armeesDesMorts.forEach(function(armee) {
      let charId = armee.get('characterid');
      let boost = 0;
      if (charAttribute(charId, "armeeDesMortsPuissant").length > 0) boost = 1;
      else boost = attrAsInt(charAttribute(charId, "armeeDesMortsTempeteDeManaIntense"), 0);
      let rayon = Math.floor(20 * Math.sqrt(1 + boost));
      let allies = alliesParPerso[charId] || new Set();
      //Pour chaque token representant ce perso
      allPersos.forEach(function(perso) {
        if (perso.charId != charId) return;
        //On cherche ensuite les tokens à portee
        allPersos.forEach(function(target) {
          if (target.token.id == perso.token.id) return;
          let tokRepresents = target.charId;
          if (tokRepresents == charId) return;
          if (allies.has(tokRepresents)) return;
          if (degatsArmeeDefense[target.token.id] != undefined || degatsArmeeFull[target.token.id] != undefined) return;
          if (predicateAsBool(perso, 'volant')) return;
          if (distanceCombat(perso.token, target.token, pageId) > rayon) return;
          if (attributeAsBool(target, 'defenseArmeeDesMorts')) {
            degatsArmeeDefense[target.token.id] = target;
          } else {
            degatsArmeeFull[target.token.id] = target;
          }
        });
      });
      if (!gmId) {
        gmId = getGMId();
        if (!gmId) return;
      }
    });
  }

  //evt a un champ attributes et un champ deletedAttributes
  function nextTurnOfActive(active, attrs, evt, combat, pageId) {
    if (active === undefined) return;
    if (active.id == "-1" && active.custom == "Tour") { //Nouveau tour
      let tour = parseInt(active.pr);
      if (isNaN(tour)) {
        error("Tour invalide", active);
        return;
      }
      if (!evt.combat) evt.combat = {...combat
      };
      evt.combat.tour = tour - 1;
      evt.updateNextInitSet = updateNextInitSet;
      active.pr = tour - 1; // préparation au calcul de l'undo
      sendChat("GM", "Début du tour " + tour);
      combat.tour = tour;
      combat.init = 1000;
      changementDeTour(tour, attrs, evt, combat, pageId);
    } else { // change le token actif
      setActiveToken(combat, active.id, evt);
    }
  }

  function nextTurn(cmp, evt) {
    if (!cmp.get('initiativepage')) return;
    let combat = stateCOF.combat;
    if (!combat) {
      error("Le script n'est pas en mode combat", cmp);
      return;
    }
    let turnOrder = cmp.get('turnorder');
    let pageId = combat.pageId;
    if (pageId === undefined) {
      pageId = cmp.get('playerpageid');
      combat.pageId = pageId;
    }
    if (turnOrder === '') return; // nothing in the turn order
    turnOrder = JSON.parse(turnOrder);
    if (turnOrder.length < 1) return; // Juste le compteur de tour
    if (stateCOF.nextPrescience) {
      stateCOF.prescience = stateCOF.nextPrescience;
      stateCOF.nextPrescience = undefined;
    }
    let active = turnOrder[0];
    let init = parseInt(active.pr);
    if (active.id == "-1" && active.custom == "Tour") {
      let tour = init; //= parseInt(active.pr);
      init = 0;
      if (isNaN(tour)) {
        error("Le tour n'est pas un nombre");
        return;
      }
      turnOrder[0] = {...active
      };
      turnOrder[0].pr = tour - 1;
    }
    let lastHead = turnOrder.pop();
    turnOrder.unshift(lastHead);
    if (evt === undefined) {
      evt = {
        type: 'nextTurn',
        attributes: [],
        deletedAttributes: [],
        turnorder: JSON.stringify(turnOrder)
      };
      addEvent(evt);
    } else {
      evt.attributes = evt.attributes || [];
      evt.deletedAttributes = evt.deletedAttributes || [];
      evt.turnorder = evt.turnorder || JSON.stringify(turnOrder);
    }
    let attrs = findObjs({
      _type: 'attribute'
    });
    // Si on a changé d'initiative, alors diminue les effets temporaires
    if (combat.init > init) {
      if (stateCOF.tokensTemps && stateCOF.tokensTemps.length > 0) {
        stateCOF.tokensTemps = stateCOF.tokensTemps.filter(function(tt) {
          if (init < tt.init && tt.init <= combat.init) {
            if (tt.duree > 1) {
              evt.tokensTemps = evt.tokensTemps || [];
              evt.tokensTemps.push({
                tt,
                ancienneDuree: tt.duree
              });
              tt.duree--;
              return true;
            } else {
              if (tt.intrusion) tt.pasDExplosion = true;
              deleteTokenTemp(tt, evt);
              return false;
            }
          } else {
            return true;
          }
        });
      }
      //attrsTemp ne contient que les attributs dont la durée doit baisser
      let attrsTemp = attrs.filter(function(obj) {
        if (!estEffetTemp(obj.get('name'))) return false;
        let obji = obj.get('max');
        return (init <= obji && obji < combat.init) || (init === 0 && obji == 1000);
      });
      if (!evt.combat) evt.combat = {...stateCOF.combat
      };
      combat.init = init;
      // Boucle sur les effets temps peut être asynchrone à cause des DM
      let count = attrsTemp.length;
      if (count === 0) {
        nextTurnOfActive(active, attrs, evt, combat, pageId);
        return;
      }
      let fin = function() {
        count--;
        if (count === 0) nextTurnOfActive(active, attrs, evt, combat, pageId);
      };
      attrsTemp.forEach(function(attr) {
        let charId = attr.get('characterid');
        const effet = effetTempOfAttribute(attr);
        if (effet === undefined) {
          //erreur, on stoppe tout
          log(attr);
          fin();
          return;
        }
        let attrName = attr.get('name');
        let effetC = effetComplet(effet, attrName);
        let v = parseInt(attr.get('current'));
        if (isNaN(v)) v = 1;
        if (v <= 1) { //L'effet arrive en fin de vie, doit être supprimé
          //Sauf si on a accumulé plusieurs fois l'effet
          let accumuleAttr = attributeExtending(charId, attrName, effetC, 'DureeAccumulee');
          if (accumuleAttr.length > 0) {
            accumuleAttr = accumuleAttr[0];
            let dureeAccumulee = accumuleAttr.get('current') + '';
            let listeDureeAccumulee = dureeAccumulee.split(',');
            evt.attributes.push({
              attribute: attr,
              current: v
            });
            let nDuree = parseInt(listeDureeAccumulee.pop());
            if (isNaN(nDuree)) {
              v = 1;
              fin();
              return;
            } else v = nDuree + 1; //car on va le diminuer plus bas.
            if (listeDureeAccumulee.length === 0) {
              evt.deletedAttributes.push(accumuleAttr);
              accumuleAttr.remove();
            } else {
              evt.attributes.push({
                attribute: accumuleAttr,
                current: dureeAccumulee
              });
              accumuleAttr.set('current', listeDureeAccumulee.join(','));
            }
          } else {
            //L'action finale
            actionEffet(attr, effet, attrName, charId, pageId, evt, function() {
              let effetFinal = finDEffet(attr, effet, attrName, charId, evt, {
                pageId
              });
              if (effetFinal && effetFinal.oldTokenId == active.id) {
                active.id = effetFinal.newTokenId;
                if (active.id === undefined) {} else if (active.id == '-1') {
                  active.custom = 'Tour';
                }
              }
              fin();
            });
            return;
          }
        }
        //Effet encore actif
        evt.attributes.push({
          attribute: attr,
          current: v
        });
        if (v > 1) attr.set('current', v - 1);
        actionEffet(attr, effet, attrName, charId, pageId, evt, fin);
      }); //fin de la boucle sur tous les attributs d'effets temporaires
    } else { //L'initiative n'a pas bougée
      nextTurnOfActive(active, attrs, evt, combat, pageId);
    }
  }

  // Les armes ---------------------------------------------------------

  //attaquant peut ne pas avoir de token
  function computeArmeAtkPNJ(attaquant, x) {
    let atk;
    let listeAttaquesPNJ;
    let oatk;
    switch (x) {
      case 'atkcac':
        let atkcac;
        listeAttaquesPNJ = listAllAttacks(attaquant);
        for (let label in listeAttaquesPNJ) {
          let att = listeAttaquesPNJ[label];
          if (atk === undefined) {
            atk = fieldAsInt(att, 'arme-atk', 0);
            oatk = atk;
          }
          let portee = fieldAsInt(att, 'arme-portee', 0);
          if (portee > 0) continue;
          let typeat = fieldAsString(att, 'arme-atktype', 'naturel');
          switch (typeat) {
            case 'sort':
            case 'jet':
              break;
            default:
              if (oatk === undefined) oatk = fieldAsInt(att, 'arme-atk', 0);
              if (atkcac === undefined) atkcac = oatk;
              if (oatk > atkcac) atkcac = oatk;
          }
        }
        if (atkcac === undefined) {
          if (atk === undefined)
            atkcac = ficheAttributeAsInt(attaquant, 'niveau', 0) + modCarac(attaquant, 'force');
          else atkcac = atk;
        }
        return atkcac;
      case 'atktir':
        let atktir;
        listeAttaquesPNJ = listAllAttacks(attaquant);
        for (let label in listeAttaquesPNJ) {
          let att = listeAttaquesPNJ[label];
          if (atk === undefined) {
            atk = fieldAsInt(att, 'arme-atk', 0);
            oatk = atk;
          }
          let portee = fieldAsInt(att, 'arme-portee', 0);
          if (portee === 0) continue;
          let typeat = fieldAsString(att, 'arme-atktype', 'naturel');
          if (typeat == 'sort') continue;
          if (oatk === undefined) oatk = fieldAsInt(att, 'arme-atk', 0);
          if (atktir === undefined) atktir = oatk;
          if (oatk > atktir) atktir = oatk;
        }
        if (atktir === undefined) {
          if (atk === undefined)
            atktir = ficheAttributeAsInt(attaquant, 'niveau', 0) + modCarac(attaquant, 'agi');
          else atktir = atk;
        }
        return atktir;
      case 'atkmag':
        let atkmag;
        listeAttaquesPNJ = listAllAttacks(attaquant);
        for (let label in listeAttaquesPNJ) {
          let att = listeAttaquesPNJ[label];
          let typeat = fieldAsString(att, 'arme-atktype', 'naturel');
          if (typeat != 'sort') continue;
          if (oatk === undefined) oatk = fieldAsInt(att, 'arme-atk', 0);
          if (atkmag === undefined) atkmag = oatk;
          if (oatk > atkmag) atkmag = oatk;
        }
        if (atkmag === undefined) {
          //Alors c'est forcément NC + VOL
          atkmag = ficheAttributeAsInt(attaquant, 'niveau', 0) + modCarac(attaquant, 'vol');
        }
        atkmag += predicateAsInt(attaquant, 'bonusAttaqueMagique', 0);
        return atkmag;
      default:
        return x;
    }
  }

  //attaquant peut ne pas avoir de token
  //options peut contenir transforme
  function computeArmeAtk(attaquant, x, options) {
    if (x === undefined) return '';
    if (persoEstPNJ(attaquant, options)) return computeArmeAtkPNJ(attaquant, x);
    let attDiv;
    let attCar;
    let attBase = 1;
    switch (x) {
      case 'atkcac':
        attDiv = ficheAttributeAsInt(attaquant, 'atkcac_buff', 0, options);
        attCar = modCarac(attaquant, 'for', options);
        attBase = ficheAttributeAsInt(attaquant, 'atkcac_base', 1, options);
        break;
      case 'atktir':
        attDiv = ficheAttributeAsInt(attaquant, 'atktir_buff', 0, options);
        attCar = modCarac(attaquant, 'agi', options);
        attBase = ficheAttributeAsInt(attaquant, 'atktir_base', 1, options);
        break;
      case 'atkmag':
        attDiv = ficheAttributeAsInt(attaquant, 'atkmag_buff', 0, options);
        attCar = modCarac(attaquant, 'vol', options);
        attBase = ficheAttributeAsInt(attaquant, 'atkmag_base', 1, options);
        break;
      default:
        return x;
    }
    return attCar + attBase + attDiv;
  }

  function identifierArme(weaponStats, pred, nom, pattern) {
    let p = pred[nom] ||
      (weaponStats.name.search(pattern) > -1) ||
      (weaponStats.modificateurs.search(pattern) > -1);
    if (p) {
      weaponStats[nom] = true;
    }
  }

  function weaponStatsOfAttack(perso, label, att) {
    let weaponStats = {
      label,
      name: fieldAsString(att, 'arme-nom', ''),
      attDiceExpr: fieldAsString(att, 'arme-dm', ''),
      //attNbDices: fieldAsInt(att, 'armedmnbde', 1),
      //attDice: fieldAsInt(att, 'armedmde', 4),
      crit: fieldAsInt(att, 'arme-crit', 20),
      divers: fieldAsString(att, 'arme-special', ''),
      portee: fieldAsInt(att, 'arme-portee', 0),
      typeAttaque: fieldAsString(att, 'arme-atktype', 'naturel'),
      modificateurs: fieldAsString(att, 'arme-atkmods', ''),
      typeDegats: fieldAsString(att, 'arme-dmtype', 'tranchants'),
      options: fieldAsString(att, 'arme-options', ''),
      //predicats: fieldAsString(att, 'armepredicats', ''),
      predicats: '', //TODO, à chercher dans l'équipement
    };
    let dm = parseDice(weaponStats.attDiceExpr);
    if (dm) {
      weaponStats.attNbDices = dm.nbDe;
      weaponStats.attDice = dm.dice;
    }
    if (persoEstPNJ(perso, optTransforme)) {
      weaponStats.attSkill = fieldAsInt(att, 'arme-atk', 0);
      weaponStats.attDMBonusCommun = fieldAsInt(att, 'arme-dmdiv', 0);
      if (perso.transforme.charId && attributeAsBool(perso, 'changementDeFormeUtiliseAttaqueMag')) {
        let attMag = computeArmeAtk(perso, 'atkmag', {});
        if (attMag > weaponStats.attSkill) weaponStats.attSkill = attMag;
      }
    } else {
      weaponStats.attSkill = fieldAsString(att, 'arme-atk', 'atkcac');
      weaponStats.attSkillDiv = fieldAsInt(att, 'arme-atkdiv', 0) + fieldAsInt(att, 'arme-buffatk', 0);
      weaponStats.attCarBonus = fieldAsString(att, 'arme-bonus', '@{for}');
      weaponStats.attDMBonusCommun = fieldAsInt(att, 'arme-dmdiv', 0) + fieldAsInt(att, 'arme-buffdm', 0);
    }
    if (fieldAsInt(att, 'arme-2m', 0) == 1) weaponStats.deuxMains = true;
    //On remplace les \n par des blancs pour l'affichage, sinon ça bug
    weaponStats.options = weaponStats.options.replace(/\n/g, ' ').trim();
    switch (weaponStats.typeAttaque) {
      case 'naturel':
        weaponStats.armeNaturelle = true;
        break;
      case 'main':
        weaponStats.arme = true;
        break;
      case 'sort':
        weaponStats.sortilege = true;
        break;
      case 'jet':
        weaponStats.armeDeJet = true;
        weaponStats.tauxDePerte = fieldAsInt(att, 'jet-perte', 0);
        weaponStats.nbArmesDeJet = fieldAsInt(att, 'jet-dispo', 1);
        weaponStats.nbArmesDeJetMax = fieldAsInt(att, 'jet-dispo_max', 1);
        weaponStats.prefixe = att.prefixe; //pour trouver l'attribut
        break;
      default:
        //On cherche si c'est une arme à 2 mains
        //Ne devrait pas servir, on a toujours un type, maintenant
        let t = weaponStats.name.toLowerCase();
        if (t.includes('2 mains') || t.includes('deux mains')) {
          weaponStats.deuxMains = true;
        } else {
          t = weaponStats.divers;
          if (t) {
            t = t.toLowerCase();
            if (t.includes('2 mains') || t.includes('deux mains')) {
              weaponStats.deuxMains = true;
            }
          }
        }
    }
    //Informations dans le champ spécial
    let champDivers = weaponStats.divers;
    if (champDivers === '') champDivers = weaponStats.predicats;
    else if (weaponStats.predicats !== '')
      champDivers += '\n' + weaponStats.predicats;
    let pred = predicateOfRaw(champDivers);
    //On transfert les prédicats connus dans weaponStats
    if (pred.charge) weaponStats.charge = toInt(pred.charge, 1);
    if (pred.legere || (weaponStats.attNbDices <= 1 && weaponStats.attDice <= 6))
      weaponStats.armeLegere = true;
    weaponStats.eclaire = toInt(pred.eclaire);
    weaponStats.eclaireFaible = toInt(pred.eclaireFaible);
    weaponStats.batarde = pred.batarde;
    if (weaponStats.batarde && weaponStats.deuxMains) {
      error("L'arme " + weaponStats.name + " est déclarée comme batârde, il faudrait en faire une arme à une main par défaut", weaponStats);
      weaponStats.deuxMains = undefined;
    }
    //Identification des catégories d'armes utilisées en jeu
    identifierArme(weaponStats, pred, 'arc', /\barc\b/i);
    identifierArme(weaponStats, pred, 'arbalete', /\barbal[eè]te\b/i);
    identifierArme(weaponStats, pred, 'baton', /\bb[aâ]ton\b/i);
    identifierArme(weaponStats, pred, 'hache', /\bhache\b/i);
    identifierArme(weaponStats, pred, 'epee', /\b[eé]p[eé]e\b/i);
    identifierArme(weaponStats, pred, 'epieu', /\b[eé]pieu\b/i);
    identifierArme(weaponStats, pred, 'fronde', /\bfronde\b/i);
    identifierArme(weaponStats, pred, 'marteau', /\bmarteau\b/i);
    identifierArme(weaponStats, pred, 'masse', /\bmasse\b/i);
    identifierArme(weaponStats, pred, 'rapiere', /\brapi[eè]re\b/i);
    identifierArme(weaponStats, pred, 'poudre', /\bpoudre\b/i);
    identifierArme(weaponStats, pred, 'sabre', /\b(katana|wakizachi|boken|demi-lame|vivelame|sabre)\b/i);
    if (weaponStats.arc && predicateAsBool(perso, 'arcDeMaitre')) {
      weaponStats.portee += 20;
    }
    if (weaponStats.poudre && predicateAsBool(perso, 'poudrePuissante')) {
      weaponStats.portee += 10;
      weaponStats.attDMBonusCommun += 2;
    }
    return weaponStats;
  }

  //perso peut ne pas avoir de token
  // si strict, on retourne undefined s'il n'existe pas d'attaque de ce label
  function getWeaponStats(perso, attackLabel, strict) {
    let weaponStats = {
      name: 'Attaque',
      attSkill: 'atkcac',
      attNbDices: 1,
      attDice: 4,
      attDMBonusCommun: 0,
      crit: 20,
      divers: '',
      portee: 0,
      typeDegats: 'contondant',
      options: '',
    };
    if (attackLabel === undefined) {
      if (strict) return;
      return weaponStats;
    }
    let attaques = listAllAttacks(perso);
    let att = attaques[attackLabel];
    if (att === undefined) {
      if (strict) return;
      if (attackLabel == -1) { //On cherche une attaque naturelle
        for (let label in attaques) {
          att = attaques[label];
          const t = fieldAsString(att, 'arme-atktype', 'naturel');
          if (t != 'naturel') continue;
          let options = ' ' + fieldAsString(att, 'arme-options', '');
          if (actionImpossible(perso, options.split(' --'), label)) continue;
          return weaponStatsOfAttack(perso, label, att);
        }
      } else weaponStats.name = attackLabel;
      return weaponStats;
    }
    return weaponStatsOfAttack(perso, attackLabel, att);
  }

  //TODO: utiliser un simple attribut armesEnMain, avec current et max.
  function getLabelArme(perso, cote, estMook) {
    persoTransforme(perso);
    if (perso.transforme.charId) {
      //On suppose que les transformations ne permettent pas de porter d'arme
      return 0;
    }
    if (cote == 'droite') return attributeAsInt(perso, 'maindroite', 0);
    let attr = tokenAttribute(perso, 'maingauche');
    if (attr.length === 0) return '0';
    return attr[0].get('current');
  }

  function setLabelArme(perso, cote, val, estMook, evt) {
    let a = 'main' + cote;
    setTokenAttr(perso, a, val, evt);
  }

  //arm doit être le résultat de getWeaponStats
  function armeDechargee(perso, arme) {
    if (!arme.charge) return false;
    let currentCharge = attributeAsInt(perso, 'charge_' + arme.label, arme.charge);
    return currentCharge === 0;
  }

  function bonusPlusViteQueSonOmbre(perso, arme) {
    let p = predicateAsBool(perso, 'plusViteQueSonOmbre');
    if (!p) return 0;
    // L'arme doit être chargée
    if (armeDechargee(perso, arme)) return 0;
    if (p === true) {
      if (arme.poudre) return 10;
      return 0;
    }
    let bonus = 10;
    let type = 'poudre';
    let i = p.search(/\d/);
    if (i > -1) {
      bonus = toInt(p.substring(i), 10);
      p = p.substring(0, i);
    }
    if (p !== '') type = p;
    if (arme[type]) return bonus;
    return 0;
  }

  function purgeCachePredicatsEquipement(perso) {
    if (perso.predicates) delete perso.predicates;
    let pred = predicatsFiche[perso.charId];
    if (pred) {
      const estMook = perso.token && perso.token.get('bar1_link') === '';
      if (estMook) return;
      delete pred.total;
      delete pred.equipement;
    }
  }

  function purgeCacheArme(perso) {
    perso.armesEnMain = undefined; //il faut enlever le cache sur l'arme en main
    perso.arme = undefined;
    purgeCachePredicatsEquipement(perso);
  }

  //Remplis les champs arme et armeGauche de perso
  //renvoie undefined si aucune arme en main principale
  //sinon renvoie l'arme principale
  function armesEnMain(perso) {
    if (perso.armesEnMain) return perso.arme;
    let labelArmePrincipale = getLabelArme(perso, 'droite');
    if (labelArmePrincipale)
      perso.arme = getWeaponStats(perso, labelArmePrincipale);
    let labelGauche = getLabelArme(perso, 'gauche');
    //TODO: changer la gestion des attaques au bouclier
    if (typeof labelGauche == 'string' && labelGauche.startsWith('b')) {
      if (perso.arme) perso.arme.deuxMains = undefined;
      let attaqueBouclier = predicateAsBool(perso, 'attaqueAuBouclier');
      if (attaqueBouclier)
        perso.armeGauche = getWeaponStats(perso, attaqueBouclier);
    } else if (labelGauche == '2m') {
      if (perso.arme) perso.arme.deuxMains = true;
    } else {
      let labelArmeGauche = toInt(labelGauche, 0);
      if (labelArmeGauche) {
        perso.armeGauche = getWeaponStats(perso, labelArmeGauche);
      }
    }
    perso.armesEnMain = 'calculee';
    return perso.arme;
  }

  //renvoie le nom de l'arme si l'arme est déjà tenue en main
  // options.seulementDroite permet de ne rengainer que l'arme droite ou de forcer à porter une arme gauche en main droite
  // options.gauche permet de rengainer ou porter l'arme en main gauche
  // options.deuxMains permet de prendre une arme à 2 mains
  // options.armeGaucheLabel permet de dégainer à la fois labelArme en main principale et ce label en arme gauche. On doit pouvoir l'abuser pour dégainer d'un coté et rengainer de l'autre.
  // Ces 4 options sont mutuellement exclusives
  // options.weaponStats permet de donner les stats de l'arme. On ignore alors l'argument labelArme
  function degainerArme(perso, labelArme, evt, options = {}) {
    if (options.gauche && options.seulementDroite) {
      error("Dégainer arme aves les options gauche et droite", options);
      return;
    }
    let nouvelleArme; //Les stats de la nouvelle arme. Si on a 2 armes, c'est l'arme principale
    let nouvelleArmeGauche; //Les stats de la nouvelle arme gauche si on a 2 armes
    let labelArmeGauche; //défini seulement si on dégaine l'arme gauche
    // et toujours différent de labelArme
    let rengainerArmePrincipale = false;
    let rengainerArmeGauche = false;
    if (options.weaponStats) {
      nouvelleArme = options.weaponStats;
      labelArme = nouvelleArme.label;
    } else if (labelArme && labelArme !== '')
      nouvelleArme = getWeaponStats(perso, labelArme, true);
    if (options.armeGaucheLabel) { //On dégaine 2 armes
      if (options.armeGaucheLabel == labelArme) {
        sendPerso("ne peut dégainer la même arme dans les deux mains");
        return;
      }
      let arme = getWeaponStats(perso, options.armeGaucheLabel, true);
      labelArmeGauche = options.armeGaucheLabel;
      nouvelleArmeGauche = arme;
      rengainerArmePrincipale = true;
      rengainerArmeGauche = true;
    } else if (options.gauche) {
      rengainerArmeGauche = true;
    } else if (options.seulementDroite) {
      rengainerArmePrincipale = true;
    } else if (options.deuxMains) {
      rengainerArmePrincipale = true;
      rengainerArmeGauche = true;
    } else {
      //On peut décider en fonction du type de l'arme
      if (nouvelleArme) {
        if (nouvelleArme.deuxMains) {
          options.deuxMains = true;
          rengainerArmePrincipale = true;
          rengainerArmeGauche = true;
        } else {
          rengainerArmePrincipale = true;
        }
      } else {
        rengainerArmePrincipale = true;
        rengainerArmeGauche = true;
      }
    }
    // On regarde ce qu'on déjà a en main
    let labelArmeActuelle;
    let labelArmeActuelleGauche = '';
    let ancienneArme;
    let message = nomPerso(perso) + " ";
    let envoieMessage = function(m) {
      if (options.messages) message += m;
      else sendPerso(perso, m, options.secret);
    };
    let changementDePrise; //si vrai, alors rengainerArmePrincipale == false
    const estMook = perso.token && perso.token.get('bar1_link') === '';
    labelArmeActuelle = getLabelArme(perso, 'droite', estMook);
    let labelGauche = getLabelArme(perso, 'gauche', estMook);
    let armeActuelleTenueADeuxMains;
    let tientUnBouclier;
    if (labelGauche == '2m') {
      //On tient l'arme actuelle à 2 mains.
      rengainerArmePrincipale = rengainerArmePrincipale || rengainerArmeGauche;
      armeActuelleTenueADeuxMains = true;
    } else if (typeof labelGauche == 'string' && labelGauche.startsWith('b')) {
      //On a un bouclier en main gauche
      tientUnBouclier = true;
    } else {
      labelArmeActuelleGauche = parseInt(labelGauche);
      if (isNaN(labelArmeActuelleGauche)) labelArmeActuelleGauche = 0;
    }
    let rienAFaire;
    if (options.deuxMains) {
      if (labelArmeActuelle == labelArme) {
        rengainerArmePrincipale = false;
        if (armeActuelleTenueADeuxMains) rienAFaire = true;
        else {
          changementDePrise = true;
          message += "prend son arme à deux mains";
          rengainerArmeGauche = false;
        }
      }
    } else if (options.gauche) {
      rienAFaire = labelArmeActuelleGauche == labelArme;
    } else if (options.seulementDroite) {
      rienAFaire = labelArmeActuelle == labelArme;
    } else { //soit 2 armes, soit pas précisé
      if (labelArmeActuelle == labelArme) {
        if (armeActuelleTenueADeuxMains) {
          rengainerArmePrincipale = false;
          changementDePrise = true;
          message += "prend son arme à une main";
        } else {
          if (labelArmeGauche) //on dégaine 2 armes
            rienAFaire = labelArmeActuelleGauche == labelArmeGauche;
          else {
            //Soit on ne dégaine que la même arme, soit c'est un ordre de rengainer (labelArme === undefined)
            rienAFaire = labelArme || !labelArmeActuelleGauche;
          }
        }
      }
    }
    if (rienAFaire) {
      //Pas besoin de dégainer ni de rengainer
      if (options.weaponStats) return options.weaponStats.name;
      if (nouvelleArme) return nouvelleArme.name;
      return;
    }
    //Messages quand on rengaine des armes, et fin des lumières
    if (labelArmeActuelle) {
      if (rengainerArmePrincipale) {
        ancienneArme = getWeaponStats(perso, labelArmeActuelle);
        if (ancienneArme === undefined) {
          error("Impossible de trouver l'arme en main", labelArmeActuelle);
          return;
        }
        let m = "rengaine " + ancienneArme.name;
        if (nouvelleArme || (labelArmeActuelleGauche && labelArmeActuelleGauche != labelArmeActuelle)) {
          m += ' et ';
        }
        envoieMessage(m);
        if (bonusPlusViteQueSonOmbre(perso, ancienneArme))
          updateNextInit(perso);
        if (ancienneArme.eclaire) {
          let pageId = perso.token.get('pageid');
          eteindreUneLumiere(perso, pageId, undefined, 'eclaire_' + labelArmeActuelle, evt);
        }
      }
    } else { //pas d'arme principale en main
      rengainerArmePrincipale = false;
    }
    if (labelArmeActuelleGauche) {
      if (rengainerArmeGauche) {
        let ancienneArmeGauche = getWeaponStats(perso, labelArmeActuelleGauche);
        if (ancienneArmeGauche === undefined) {
          error("Impossible de trouver l'arme en main gauche", labelArmeActuelleGauche);
          return;
        }
        if (options.messages) {
          if (ancienneArme) message += ancienneArmeGauche.name + ", et ";
          else message += "rengaine " + ancienneArmeGauche.name + " et ";
        } else sendPerso(perso, "rengaine " + ancienneArmeGauche.name, options.secret);
        if (ancienneArmeGauche.eclaire) {
          let pageId = perso.token.get('pageid');
          eteindreUneLumiere(perso, pageId, undefined, 'eclaire_' + labelArmeActuelleGauche, evt);
        }
      }
    } else { //Pas d'arme en main gauche
      rengainerArmeGauche = false;
    }
    let remetBouclier;
    //Puis on dégaine
    //mais on vérifie que l'arme existe, sinon c'est juste un ordre de rengainer
    if (nouvelleArme === undefined) {
      if (labelArmeActuelle) {
        purgeCacheArme(perso);
        if (!options.gauche) setLabelArme(perso, 'droite', 0, estMook, evt);
        if (!options.seulementDroite) {
          if (!tientUnBouclier && ficheAttributeAsBool(perso, 'bouclier_eqp', false)) {
            let bouclier;
            if (estMook) bouclier = 'b-1';
            else bouclier = 'b' + ficheAttributeMax(perso, 'maingauche', '-1');
            sendPerso(perso, "remet son bouclier", options.secret);
            setLabelArme(perso, 'auche', bouclier, estMook, evt);
            remetBouclier = true;
          } else {
            setLabelArme(perso, 'gauche', 0, estMook, evt);
          }
        }
      }
      return;
    }
    if (nouvelleArme.deuxMains || options.deuxMains || nouvelleArmeGauche) {
      if (tientUnBouclier) {
        sendPerso(perso, "enlève son bouclier", options.secret);
      }
    } else if (changementDePrise ||
      (rengainerArmeGauche && !nouvelleArmeGauche) ||
      armeActuelleTenueADeuxMains) {
      if (!tientUnBouclier && ficheAttributeAsBool(perso, 'boucier_eqp', false)) {
        let bouclier;
        if (estMook) bouclier = 'b-1';
        else bouclier = 'b' + ficheAttributeMax(perso, 'maingauche', '-1');
        sendPerso(perso, "remet son bouclier", options.secret);
        setLabelArme(perso, 'gauche', bouclier, estMook, evt);
        purgeCacheArme(perso);
        remetBouclier = true;
      }
    }
    if (labelArmeActuelle) { //On avait une arme en main
      if (options.gauche) {
        if (nouvelleArme) setLabelArme(perso, 'gauche', labelArme, estMook, evt);
        else setLabelArme(perso, 'gauche', 0, estMook, evt);
        if (rengainerArmePrincipale) setLabelArme(perso, 'droite', 0, estMook, evt);
      } else {
        if (nouvelleArme) setLabelArme(perso, 'droite', labelArme, estMook, evt);
        else setLabelArme(perso, 'droite', 0, estMook, evt);
        if (labelArmeGauche) setLabelArme(perso, 'gauche', labelArmeGauche, estMook, evt);
        else if (nouvelleArme && (nouvelleArme.deuxMains || options.deuxMains))
          setLabelArme(perso, 'gauche', '2m', estMook, evt);
        else if (!remetBouclier &&
          (changementDePrise || (ancienneArme && ancienneArme.deuxMains)))
          setLabelArme(perso, 'gauche', '0', estMook, evt);
      }
      purgeCacheArme(perso);
    } else { //On n'avait pas d'arme en main
      if (stateCOF.combat && nouvelleArme && nouvelleArme.portee === 0 &&
        predicateAsBool(perso, 'frappeDuVide') &&
        !attributeAsBool(perso, 'limiteParCombat_dejaFrappeContact')) {
        setTokenAttr(perso, 'limiteParTour_frappeDuVidePossible', true, evt);
      }
      if (options.gauche) {
        setLabelArme(perso, 'gauche', labelArme, estMook, evt);
      } else {
        if (labelArmeGauche)
          setLabelArme(perso, 'gauche', labelArmeGauche, estMook, evt);
        else if (options.deuxMains || nouvelleArme.deuxMains)
          setLabelArme(perso, 'gauche', '2m', estMook, evt);
        setLabelArme(perso, 'droite', labelArme, estMook, evt);
      }
      purgeCacheArme(perso);
    }
    if (options.messages) {
      if (changementDePrise) {
        if (nouvelleArmeGauche) message += ", et dégaine " + nouvelleArmeGauche.name;
      } else if (nouvelleArme) {
        message += "dégaine " + nouvelleArme.name;
        if (nouvelleArmeGauche) message += " et " + nouvelleArmeGauche.name;
      } else if (nouvelleArmeGauche) message += "dégaine " + nouvelleArmeGauche.name;
      options.messages.push(message);
    } else {
      if (changementDePrise) {
        if (nouvelleArmeGauche) message += ", et dégaine " + nouvelleArmeGauche.name;
      } else if (nouvelleArme) {
        message = "dégaine " + nouvelleArme.name;
        if (nouvelleArmeGauche) message += " et " + nouvelleArmeGauche.name;
      } else if (nouvelleArmeGauche) message += "dégaine " + nouvelleArmeGauche.name;
      sendPerso(perso, message, options.secret);
    }
    //L'éclairage des nouvelles armes
    if (nouvelleArme && !changementDePrise) {
      let radius = nouvelleArme.eclaire;
      if (radius && radius > 0) {
        let dimRadius = nouvelleArme.eclaireFaible;
        if (dimRadius === undefined || dimRadius >= radius) dimRadius = '';
        ajouteUneLumiere(perso, 'eclaire_' + labelArme, radius, dimRadius, evt);
      }
      if (bonusPlusViteQueSonOmbre(perso, nouvelleArme)) updateNextInit(perso);
    }
    if (nouvelleArmeGauche) {
      let radius = nouvelleArmeGauche.eclaire;
      if (radius && radius > 0) {
        let dimRadius = nouvelleArmeGauche.eclaireFaible;
        if (dimRadius === undefined || dimRadius >= radius) dimRadius = '';
        ajouteUneLumiere(perso, 'eclaire_' + labelArmeGauche, radius, dimRadius, evt);
      }
    }
  }

  function sortirDuCombat() {
    stateCOF.prescience = undefined;
    stateCOF.nextPrescience = undefined;
    let combat = stateCOF.combat;
    if (!combat) {
      log("Pas en combat");
      sendChat('GM', "/w GM Le combat est déjà terminé");
      return;
    }
    sendChat('GM', "Le combat est terminé");
    let evt = {
      type: 'fin_combat',
      initiativepage: Campaign().get('initiativepage'),
      turnorder: Campaign().get('turnorder'),
      attributes: [],
      combat,
      deletedAttributes: [],
      chargeFantastique: stateCOF.chargeFantastique,
    };
    stateCOF.combat = false;
    stateCOF.chargeFantastique = undefined;
    setActiveToken(combat, undefined, evt);
    Campaign().set('initiativepage', false);
    let attrs = findObjs({
      _type: 'attribute'
    });
    // Fin des effets qui durent pour le combat
    attrs = removeAllAttributes('attributDeCombat', evt, attrs);
    attrs = removeAllAttributes('limiteParCombat', evt, attrs);
    attrs = removeAllAttributes('limiteParTour', evt, attrs);
    // Autres attributs
    //recupererMunitions(attrs, evt); //TODO quand ce sera réglé sur la fiche
    recupererArmesDeJet(attrs, evt);
    //Utilisation automatique de second souffle, si pas utilisé
    let tokens = findObjs({ // Les tokens sur la page du combat
      _type: 'graphic',
      _subtype: 'token',
      _pageid: combat.pageId,
    });
    let persosDuCombat = []; //peuplé la première fois qu'on regarde les tokens
    let persoParCharId = {}; //Pour ne garder qu'un jeu de prédicat par charId
    tokens.forEach(function(token) {
      let charId = token.get('represents');
      if (charId === '' || charId === undefined) return;
      let perso = {
        token: token,
        charId: charId
      };
      persosDuCombat.push(perso);
      let persoTest = persoParCharId[charId];
      if (persoTest === undefined) {
        persoParCharId[charId] = perso;
      }
    });
    // Pour frappe du vide, on rengaine l'arme, cela remet aussi l'attribut
    persosDuCombat.forEach(function(perso) {
      let persoTest = persoParCharId[perso.charId];
      if (predicateAsBool(persoTest, 'frappeDuVide')) {
        degainerArme(perso, '', evt);
      }
    });
    // On remet en main l'arme par défaut si elle est précisée
    persosDuCombat.forEach(function(perso) {
      if (!isActive(perso)) return;
      let persoTest = persoParCharId[perso.charId];
      let arme = predicateAsBool(persoTest, 'armeParDefaut');
      if (arme === undefined || arme === false) return;
      if (arme === true) degainerArme(perso, '', evt);
      else degainerArme(perso, arme, evt);
    });
    // On recharge les armes
    let charges = {};
    persosDuCombat.forEach(function(perso) {
      let persoTest = persoParCharId[perso.charId];
      if (charges[persoTest.charId] === undefined) {
        charges[persoTest.charId] = {};
        let attaques = listAllAttacks(perso);
        for (let label in attaques) {
          let att = attaques[label];
          let rawArme = fieldAsString(att, 'armepredicats', '');
          if (rawArme) {
            let predicats = predicateOfRaw(rawArme);
            if (predicats.charge) {
              let chargeMax = predicats.charge;
              if (chargeMax === true) chargeMax = 1;
              charges[persoTest.charId][label] = chargeMax;
            }
          }
        }
      }
      for (let label in charges[persoTest.charId]) {
        setTokenAttr(perso, 'charge_' + label, charges[persoTest.charId][label], evt);
      }
    });
    //Remise à zéro des options de combat
    let def0 = {
      default: 0
    };
    persosDuCombat.forEach(function(perso) {
      setFicheAttr(perso, 'attaque_de_groupe', 1, evt, {
        default: 1
      });
      setFicheAttr(perso, 'attaque_en_puissance_check', 0, evt, def0);
      setFicheAttr(perso, 'attaque_risquee_check', 0, evt, def0);
      setFicheAttr(perso, 'attaque_assuree_check', 0, evt, def0);
      setFicheAttr(perso, 'attaque_dm_temp_check', 0, evt, def0);
    });
    //Effet de ignorerLaDouleur
    let ilds = allAttributesNamed(attrs, 'douleurIgnoree');
    ilds = ilds.concat(allAttributesNamed(attrs, 'memePasMalIgnore'));
    ilds.forEach(function(ild) {
      let douleur = parseInt(ild.get('current'));
      if (isNaN(douleur)) {
        error("La douleur ignorée n'est pas un nombre", douleur);
        return;
      }
      let charId = ild.get('characterid');
      if (charId === undefined || charId === '') {
        error("Attribut sans personnage", ild);
        return;
      }
      let ildName = ild.get('name');
      if (ildName == 'douleurIgnoree' || ildName == 'memePasMalIgnore') {
        let pvAttr = findObjs({
          _type: 'attribute',
          _characterid: charId,
          name: 'PV'
        }, {
          caseInsensitive: true
        });
        if (pvAttr.length === 0) {
          error("Personnage sans PV ", charId);
          return;
        }
        pvAttr = pvAttr[0];
        let pv = parseInt(pvAttr.get('current'));
        if (isNaN(pv)) {
          error("PV mal formés ", pvAttr);
          return;
        }
        evt.attributes.push({
          attribute: pvAttr,
          current: pv
        });
        let newPv = pv - douleur;
        if (newPv < 0) newPv = 0;
        pvAttr.set('current', newPv);
        if (pv > 0 && newPv === 0) {
          sendChar(charId, "s'écroule. Il semble sans vie. La douleur qu'il avait ignorée l'a finalement rattrapé...", true);
        } else {
          let tempDmg = ficheAttributeAsInt({
            charId
          }, 'DMTEMP', 0);
          if (pv > tempDmg && newPv <= tempDmg) {
            sendChar(charId, "s'écroule, assommé. La douleur qu'il avait ignorée l'a finalement rattrapé...", true);
          } else {
            sendChar(charId, "subit le contrecoup de la douleur qu'il avait ignorée", true);
          }
        }
      } else { // ignorer la douleur d'un token
        let tokName = ildName.substring(ildName.indexOf('_') + 1);
        let tokensIld = findObjs({
          _type: 'graphic',
          _subtype: 'token',
          represents: charId,
          name: tokName
        });
        if (tokensIld.length === 0) {
          error("Pas de token nommé " + tokName + " qui aurait ignoré la douleur", ild);
          return;
        }
        if (tokensIld.length > 1) {
          sendChar(charId, "a plusieurs tokens nommés " + tokName + ". Un seul d'entre eux subira l'effet d'ignorer la douleur", true);
        }
        let tokPv = parseInt(tokensIld[0].get('bar1_value'));
        let tokNewPv = tokPv - douleur;
        if (tokNewPv < 0) tokNewPv = 0;
        let perso = {
          charId: charId,
          token: tokensIld[0]
        };
        updateCurrentBar(perso, 1, tokNewPv, evt);
        //TODO: faire mourrir, assommer
      }
    }); // end forEach on all attributes ignorerLaDouleur
    ilds.forEach(function(ild) {
      evt.deletedAttributes.push(ild);
      ild.remove();
    });
    if (ilds.length > 0) {
      attrs = attrs.filter(function(attr) {
        let ind = ilds.findIndex(function(nattr) {
          return nattr.id == attr.id;
        });
        return (ind == -1);
      });
    }
    //Attributs qu'on veut enlever en dernier
    let removedLaterAttrs = [];
    // fin des effets temporaires (durée en tours, ou durée = combat)
    attrs.forEach(function(obj) {
      let attrName = obj.get('name');
      let charId = obj.get('characterid');
      if (estEffetTemp(attrName)) {
        finDEffet(obj, effetTempOfAttribute(obj), attrName, charId, evt, {
          pageId: combat.pageId
        });
      } else if (estAttributEffetTemp(attrName)) {
        removedLaterAttrs.push(obj);
      } else if (estEffetCombat(attrName)) {
        let effet = effetCombatOfAttribute(obj);
        if (effet == 'armeDArgent') {
          //Alors on va rengainer l'arme en main si c'est l'arme d'argent
          iterTokensOfAttribute(charId, combat.pageId, effet, attrName, function(token) {
            let perso = {
              token: token,
              charId: charId
            };
            let arme = armesEnMain(perso);
            if (!arme) return;
            let options = arme.options;
            if (options === '') return;
            if (!options.startsWith(' ')) options = ' ' + options;
            options = options.split(' --');
            options.find(function(o) {
              if (o.startsWith('si ')) {
                o = o.split(' ');
                if (o.includes('armeDArgent')) {
                  degainerArme(perso, '', evt);
                  return true;
                }
              }
              return false;
            });
          });
        }
        let mEffet = messageEffetCombat[effet];
        let efComplet = effetComplet(effet, attrName);
        let mc = messageFin({
          charId
        }, mEffet, efComplet, attrName);
        if (mc && mc !== '') sendChar(charId, mc, true);
        //On remet la face du token si besoin
        let attrTS = attributeExtending(charId, attrName, effet, 'TokenSide');
        if (attrTS.length > 0) {
          attrTS = attrTS[0];
          let side = attrTS.get('current');
          iterTokensOfAttribute(charId, combat.pageId, effet, attrName, function(token) {
            changeTokenSide({
              token
            }, side, evt);
          }, {
            tousLesTokens: true
          });
          //Pas besoin de détruire l'attribut, ce sera fait plus loin
        }
        evt.deletedAttributes.push(obj);
        obj.remove();
        let ms = mEffet.statusMarker;
        if (ms) {
          iterTokensOfAttribute(charId, combat.pageId, effet, attrName, function(token) {
            affectToken(token, 'statusmarkers', token.get('statusmarkers'), evt);
            token.set('status_' + ms, false);
          });
        }
        if (effet == 'estGobePar') {
          iterTokensOfAttribute(charId, combat.pageId, effet, attrName, function(token) {
            let perso = {
              token: token,
              charId: charId
            };
            unlockToken(perso, evt);
          });
        }
      } else if (estAttributEffetCombat(attrName)) {
        removedLaterAttrs.push(obj);
      }
    });
    removedLaterAttrs.forEach(function(obj) {
      if (getObj('attribute', obj.id)) {
        evt.deletedAttributes.push(obj);
        obj.remove();
      }
    });
    if (stateCOF.tokensTemps) {
      evt.deletedTokensTemps = [];
      stateCOF.tokensTemps.forEach(function(tt) {
        if (tt.intrusion) tt.pasDExplosion = true;
        deleteTokenTemp(tt, evt);
      });
      delete stateCOF.tokensTemps;
    }
    addEvent(evt);
  }

  function commandeFinCombat(msg, cmd, playerId, pageId, options) {
    sortirDuCombat();
  }
  // Les dégâts ------------------------------------------------------------

  //Appelé quand on met à 0 PV
  function mort(personnage, expliquer, evt) {
    if (getState(personnage, 'mort')) return; //déjà mort
    let addMsg = function(msg) {
      if (expliquer) {
        expliquer(nomPerso(personnage) + ' ' + msg);
      } else {
        sendPerso(personnage, msg);
      }
    };
    // Suppression Zombies
    let attrsDegradationZombie = tokenAttribute(personnage, 'degradationZombie');
    if (attrsDegradationZombie.length > 0) {
      finDEffet(attrsDegradationZombie[0], 'degradationZombie', attrsDegradationZombie[0].get("name"), personnage.charId, evt);
      return;
    }
    //Phénix
    let phenix = testLimiteUtilisationsCapa(personnage, 'phenix', 'combat');
    if (phenix) { //TODO: revoir l'effet
      addMsg("se relève, nimbé" + eForFemale(personnage) + " d'une aura de lumière et de feu prenant la forme d'un phénix.");
      utiliseCapacite(personnage, phenix, evt);
      soinsDuPhenix(personnage, evt, expliquer);
      return;
    }
    setState(personnage, 'mort', true, evt);
    let targetPos = {
      x: personnage.token.get('left'),
      y: personnage.token.get('top')
    };
    spawnFxBetweenPoints(targetPos, {
      x: 400,
      y: 400
    }, 'splatter-blood');
  }

  //TODO: implémenter !cof2-mettre-a-zero-pv
  function mettreAZeroPV(target, pvMax, evt, expliquer, really) {
    if (!really && predicateAsBool(target, 'mortDemandeConfirmation')) {
      let command = "!cof2-mettre-a-zero-pv " + target.token.id + ' ' + evt.id;
      let msg = "/w GM " + nomPerso(target) + " a pris un coup mortel." + boutonSimple(command, "Confirmer");
      setTimeout(_.bind(sendChat, undefined, '', msg), 2000);
      return;
    }
    updateCurrentBar(target, 1, 0, evt);
    if (predicateAsBool(target, 'baroudHonneur')) {
      let msgBarroud = nomPerso(target) + " devrait être mort";
      msgBarroud += eForFemale(target) + ", mais ";
      msgBarroud += onGenre(target, 'il', 'elle') + " continue à se battre !";
      expliquer(msgBarroud);
      setTokenAttr(target, 'baroudHonneurActif', true, evt);
    } else if (predicateAsBool(target, 'increvable') && attributeAsInt(target, 'limiteParCombat__increvable', predicateAsInt(target, 'increvable', 1)) > 0) {
      let msgIncrevable = nomPerso(target) + " devrait être mort";
      msgIncrevable += eForFemale(target) + ", mais ";
      msgIncrevable += onGenre(target, 'il', 'elle') + " est increvable !";
      expliquer(msgIncrevable);
      let restants = attributeAsInt(target, 'limiteParCombat__increvable', predicateAsInt(target, 'increvable', 1));
      setTokenAttr(target, 'limiteParCombat__increvable', restants - 1, evt);
      setTokenAttr(target, 'increvableActif', true, evt);
    } else if ((attributeAsBool(target, 'enrage') || predicateAsBool(target, 'durACuire')) &&
      !attributeAsBool(target, 'aAgiAZeroPV')) {
      let msgAgitZ = nomPerso(target) + " devrait être mort";
      msgAgitZ += eForFemale(target) + ", mais ";
      msgAgitZ += onGenre(target, 'il', 'elle') + " continue à se battre !";
      expliquer(msgAgitZ);
      if (!attributeAsBool(target, 'agitAZeroPV'))
        setAttrDuree(target, 'agitAZeroPV', 1, evt);
    } else if (predicateAsBool(target, 'nAbandonneJamais')) {
      if (attributeAsBool(target, 'mortMaisNAbandonnePas')) {
        expliquer(nomPerso(target) + " est dans un état lamentable, mais continue à bouger. Il faudrait une action limitée pour le réduire en miettes.");
      } else {
        expliquer(nomPerso(target) + " est pratiquement détruit, mais continue à bouger !");
        setTokenAttr(target, 'mortMaisNAbandonnePas', true, evt);
        setState(target, 'ralenti', true, evt);
      }
    } else if (predicateAsBool(target, 'exsangue') && !attributeAsBool(target, 'etatExsangue')) {
      let msg;
      if (expliquer) {
        expliquer(nomPerso(target) + " continue à agir malgré son état");
      } else msg = "continue à agir malgré son état";
      setTokenAttr(target, 'etatExsangue', true, evt, {
        msg
      });
    } else {
      mort(target, expliquer, evt);
    }
  }

  //TODO: regarder si on a encore besoin de tout ça
  function postBarUpdateForDealDamage(target, dmgTotal, pvPerdus, bar1, tempDmg, dmgDisplay, showTotal, dmDrains, displayRes, evt, expliquer) {
    target.pvPerdus = target.pvPerdus || pvPerdus;
    if (bar1 > 0 && tempDmg >= bar1) { //assommé
      setState(target, 'assomme', true, evt);
    }
    let attrsLienDeSang = tokenAttribute(target, "lienDeSangVers");
    if (attrsLienDeSang.length > 0) {
      let lienDuSangDmg = Math.floor(dmgTotal / 2);
      if (lienDuSangDmg > 0) {
        let vus = new Set();
        attrsLienDeSang.forEach(function(attr) {
          let r = {
            total: lienDuSangDmg,
            type: 'normal',
            display: lienDuSangDmg
          };
          let personnageLie = persoOfId(attr.get("current"));
          if (personnageLie) {
            if (vus.has(personnageLie.token.id)) return;
            vus.add(personnageLie.token.id);
            expliquer("Le lien de sang inflige " + lienDuSangDmg + " dégâts à " + personnageLie.token.get("name"));
            dealDamage(personnageLie, r, [], evt, false);
          }
        });
      }
    }
    if (showTotal) dmgDisplay += " = " + dmgTotal;
    if (displayRes === undefined) return;
    displayRes(dmgDisplay, pvPerdus, dmDrains);
  }

  //target prend un coup qui lui fait perdre tous ses PVs
  // Asynchrone
  function prendreUnCoupMortel(target, dmgTotal, pvPerdus, bar1, pvMax, tempDmg, dmgDisplay, showTotal, dmDrains, displayRes, options, evt, expliquer) {
    pvPerdus += bar1;
    if (predicateAsBool(target, 'defierLaMort')) {
      let defierLaMort = charAttributeAsInt(target, 'defierLaMort', 10);
      let rollId = 'defierLaMort_' + target.token.id;
      let saveOpts = {
        msgPour: " pour défier la mort",
        msgReussite: ", conserve 1 PV",
        rolls: options.rolls,
        chanceRollId: options.chanceRollId
      };
      if (attributeAsBool(target, 'rageDuBerserk')) saveOpts.bonus = 10;
      save({
          carac: 'CON',
          seuil: defierLaMort
        }, target, rollId, expliquer, saveOpts, evt,
        function(reussite, rollText) {
          if (reussite) {
            bar1 = 1;
            pvPerdus--;
            setTokenAttr(target, 'defierLaMort', defierLaMort + 10, evt);
            updateCurrentBar(target, 1, 1, evt);
          } else {
            mettreAZeroPV(target, pvMax, evt, expliquer);
          }
          postBarUpdateForDealDamage(target, dmgTotal, pvPerdus, bar1, tempDmg, dmgDisplay, showTotal, dmDrains, displayRes, evt, expliquer);
        });
      //On arrête là, car tout le reste est fait dans la continuation du save.
      return;
    }
    mettreAZeroPV(target, pvMax, evt, expliquer);
    postBarUpdateForDealDamage(target, dmgTotal, pvPerdus, bar1, tempDmg, dmgDisplay, showTotal, dmDrains, displayRes, evt, expliquer);
  }

  function rollAndDealDmg(perso, dmg, type, effet, attrName, msg, count, evt, options, callback, display) {
    if (options.valeur) {
      let attrsVal = tokenAttribute(perso, options.valeur);
      if (attrsVal.length > 0) {
        dmg = attrsVal[0].get('current');
        let dmgDice = parseDice(dmg);
        if (dmgDice) {
          if (dmgDice.nbDe === 0) dmg = {
            cst: dmgDice.bonus
          };
          else if (dmgDice.bonus === 0) dmg = {
            de: dmgDice.dice,
            nbDe: dmgDice.nbDe
          };
        }
      }
    }
    let dmgExpr = dmg;
    if (dmg.de) {
      dmgExpr = dmg.nbDe + 'd' + dmg.de;
    } else if (dmg.cst) {
      dmgExpr = dmg.cst;
    } else if (options.dotGen) {
      //alors dmg = '' et type = ''
      let valAttr = tokenAttribute(perso, effet + 'Valeur');
      if (valAttr.length === 0) {
        //Par défaut, 1d6 DM normaux
        dmgExpr = "1d6";
        type = 'normal';
      } else {
        dmgExpr = valAttr[0].get('current');
        type = valAttr[0].get('max');
        if (type === '') type = 'normal';
      }
    }
    getEffectOptions(perso, effet, options);
    sendChat('', "[[" + dmgExpr + "]]", function(res) {
      let rolls = res[0];
      let dmgRoll = rolls.inlinerolls[0];
      let r = {
        total: dmgRoll.results.total,
        type: type,
        display: buildinline(dmgRoll, type)
      };
      let explications;
      if (display) explications = [];
      dealDamage(perso, r, [], evt, false, options, explications,
        function(dmgDisplay, dmg) {
          if (dmg > 0) {
            let msgDm;
            if (msg) msgDm = msg + '. ' + onGenre(perso, 'Il', 'Elle');
            else msgDm = '';
            if (display) {
              explications.forEach(function(m) {
                addLineToFramedDisplay(display, m);
              });
              addLineToFramedDisplay(display, nomPerso(perso) + ' ' + msgDm + " subit " + dmgDisplay + " DM");
              sendFramedDisplay(display);
            } else if (effet == attrName) {
              sendPerso(perso, msgDm + " subit " + dmgDisplay + " DM");
            } else {
              let tokenName = attrName.substring(attrName.indexOf('_') + 1);
              sendChat('', tokenName + ' ' + msgDm + " subit " + dmgDisplay + " DM");
            }
          }
          count.v--;
          if (count.v === 0) callback();
        });
    }); //fin sendChat du jet de dé
  }

  function immuniseAuType(target, dmgType, attaquant, options) {
    if (predicateAsBool(target, 'immunite_' + dmgType)) {
      return true;
    }
    if (attributeAsBool(target, 'immuniteA' + dmgType)) return true;
    if (options.tranchant && predicateAsBool(target, 'immunite_tranchant')) return true;
    if (options.contondant && predicateAsBool(target, 'immunite_contondant')) return true;
    if (options.percant && predicateAsBool(target, 'immunite_percant')) return true;
    //TODO: revoir cette liste
    switch (dmgType) {
      case 'acide':
        return false;
      case 'poison':
        if (estNonVivant(target)) return true;
        if (estDemon(target) && !(options && options.magique)) return true;
        if (predicateAsBool(target, 'vegetatif')) return true;
        return false;
      case 'feu':
        if (attributeAsBool(target, 'armureDeFeu')) return true;
        return false;
      case 'froid':
        return attributeAsBool(target, 'presenceGlaciale');
      case 'maladie':
        if (estNonVivant(target)) return true;
        if (estDemon(target) && !(options && options.magique)) return true;
        if (predicateAsBool(target, 'vegetatif')) return true;
        return attributeAsBool(target, 'sangDeLArbreCoeur');
      case 'drain':
        return predicateAsInt(target, 'voieDeLArchange', 1) > 2 && attributeAsBool(target, 'formeDAnge');
    }
    if (options.attaqueMentale && predicateAsBool(target, 'immunite_mental')) return true;
    return false;
  }

  function ajouteDe6Crit(x, first, max) {
    let bonusCrit = rollDePlus(6, {
      maxResult: max
    });
    if (first) x.dmgDisplay = "(" + x.dmgDisplay + ")";
    x.dmgDisplay += '+' + bonusCrit.roll;
    x.dmgTotal += bonusCrit.val;
  }

  // Fonction asynchrone
  // displayRes est optionnel, et peut avoir 2 arguments
  // - un texte affichant le jet de dégâts
  // - la valeur finale des dégâts infligés
  // crit est un booléen, il augmente de 1 (ou options.critCoef) le coefficient (option.dmgCoef) et active certains effets
  function dealDamage(target, dmg, otherDmg, evt, crit, options = {}, explications = false, displayRes = false) {
    let expliquer = function(msg) {
      if (explications) explications.push(msg);
      else sendPerso(target, msg);
    };
    if (options.interposer) {
      return dealDamageAfterOthers(target, crit, {}, evt, expliquer, displayRes, options.interposer, dmg.display, false, {});
    }
    if ((!options.spectral && attributeAsBool(target, 'intangible') && attributeAsInt(target, 'intangibleValeur', 1)) ||
      attributeAsBool(target, 'ombreMortelle') ||
      (options.aoe === undefined &&
        attributeAsBool(target, 'formeGazeuse')) ||
      (predicateAsBool(target, 'apparition') && !options.energiePositive)) {
      expliquer("L'attaque passe à travers de " + nomPerso(target));
      if (displayRes) displayRes('0', 0, 0);
      return 0;
    }
    if (options.asphyxie) {
      if (immuniseAsphyxie(target, expliquer)) {
        if (displayRes) displayRes('0', 0, 0);
        return 0;
      }
    }
    if (!options.magique && !options.sortilege && dmg.type != 'magique' &&
      (predicateOrAttributeAsBool(target, 'immunite_nonMagique') || predicateAsBool(target, 'creatureIntangible'))) {
      expliquer("L'attaque ne semble pas affecter " + nomPerso(target));
      if (displayRes) displayRes('0', 0, 0);
      return 0;
    }
    if ((options.magique || options.sortilege || dmg.type == 'magique') && predicateAsBool(target, 'immunite_magique')) {
      expliquer("L'attaque ne semble pas affecter " + nomPerso(target));
      if (displayRes) displayRes('0', 0, 0);
      return 0;
    }
    let dmgCoef = options.dmgCoef || 1;
    if (target.dmgCoef) dmgCoef += target.dmgCoef;
    if (options.ferFroid && (estDemon(target) || estFee(target))) dmgCoef += 1;
    let diviseDmg = options.diviseDmg || 1;
    if (target.diviseDmg) diviseDmg *= target.diviseDmg;
    if (options.sortilege && predicateAsBool(target, 'esquiveDeLaMagie'))
      diviseDmg *= 2;
    if (options.attaqueDeGroupeDmgCoef) {
      dmgCoef++;
      expliquer("Attaque en groupe > DEF +" + reglesOptionelles.haute_DEF.val.crit_attaque_groupe.val + " => DMGx" + (crit ? "3" : "2"));
    }
    let critCoef = 1;
    if (crit) {
      if (attributeAsBool(target, 'danseDesLames')) {
        removeTokenAttr(target, 'danseDesLames', evt);
        expliquer("Le coup critique fait sortir de la transe de danse des lames");
      }
      if (predicateAsBool(target, 'lycanthrope')) {
        let commande = "!cof-jet SAG 18 --predicat controleLoupGarou --nom Résister --succes évite de se transformer --target " + target.token.id;
        expliquer("Le coup critique transforme en bête enragée, à moins de réussir un " + boutonSimple(commande, "jet de SAG"));
      }
      if (predicateAsBool(target, 'armureLourdeGuerrier') &&
        ficheAttributeAsBool(target, 'defarmureon', false) &&
        ficheAttributeAsInt(target, 'defarmure', 0) >= 7) {
        expliquer("L'armure lourde de " + nomPerso(target) + " lui permet d'ignorer les dégâts critiques");
      } else if (predicateAsBool(target, 'immuniteAuxCritiques')) {
        expliquer("Le succès critique est sans effet");
      } else {
        if (options.critCoef) critCoef = options.critCoef;
        if (target.critCoef) critCoef += target.critCoef;
        dmgCoef += critCoef;
        if (predicateAsBool(target, 'armureProtection') && ficheAttributeAsBool(target, 'defarmureon', false)) {
          expliquer("L'armure de protection de " + nomPerso(target) + " le protège du critique");
          diviseDmg++;
        } else if (predicateAsBool(target, 'bouclierProtection') && ficheAttributeAsInt(target, 'defbouclieron', 0)) {
          expliquer("Le bouclier de protection de " + nomPerso(target) + " le protège du critique");
          diviseDmg++;
        } else if (predicateAsBool(target, 'anneauProtection')) {
          expliquer("L'anneau de protection de " + nomPerso(target) + " le protège du critique");
          diviseDmg++;
        }
        if (predicateAsBool(target, 'bouclierProtection') && ficheAttributeAsBool(target, 'defbouclieron', false)) {
          expliquer("Le bouclier de protection de " + nomPerso(target) + " le protège du critique");
          diviseDmg++;
        }
      }
    }
    otherDmg = otherDmg || [];
    let dmgDisplay = dmg.display;
    let dmgTotal = dmg.total;
    if (dmgTotal < 1 && !(dmg.value && dmg.value.startsWith('0'))) {
      dmgDisplay += ' -> 1';
      dmgTotal = 1;
    }
    let showTotal = false;
    if (dmgCoef > 1) {
      dmgDisplay += " X " + dmgCoef;
      dmgTotal = dmgTotal * dmgCoef;
      showTotal = true;
    }
    if (diviseDmg > 1) {
      if (showTotal) dmgDisplay = '(' + dmgDisplay + ')';
      dmgDisplay += " / " + diviseDmg;
      dmgTotal = Math.ceil(dmgTotal / diviseDmg);
      showTotal = true;
    }
    if (crit) {
      let messageCrit = predicateAsBool(target, 'messageSiCritique');
      if (messageCrit) expliquer(messageCrit);
      if (predicateAsBool(target, 'fureurDrakonide')) {
        expliquer("le coup critique rend " + nomPerso(target) + " furieu" + onGenre(target, 'x', 'se'));
        setTokenAttr(target, 'fureurDrakonideCritique', true, evt);
      }
      if (predicateAsBool(target, 'memePasMal')) {
        options.memePasMal = (dmgTotal / dmgCoef) * critCoef;
      }
      let firstBonusCritique = true;
      let x = {
        dmgDisplay,
        dmgTotal
      };
      if (options.affute) {
        ajouteDe6Crit(x, firstBonusCritique, options.kiai);
        firstBonusCritique = false;
      }
      if (options.sortilege && options.attaquant && predicateAsBool(options.attaquant, 'critiqueEpiqueSorts')) {
        ajouteDe6Crit(x, firstBonusCritique, options.kiai);
        firstBonusCritique = false;
      }
      if (options.tirFatal) {
        ajouteDe6Crit(x, firstBonusCritique, options.kiai);
        if (options.tirFatal > 1) {
          ajouteDe6Crit(x, false, options.kiai);
        }
      }
      if (target.additionalCritDmg) {
        target.additionalCritDmg.forEach(function(dmSpec) {
          if (firstBonusCritique) {
            x.dmgDisplay = "(" + x.dmgDisplay + ")";
            firstBonusCritique = false;
          }
          x.dmgDisplay += '+' + dmSpec.display;
          x.dmgTotal += dmSpec.total;
        });
      }
      if (options.memePasMal !== undefined) {
        options.memePasMal += x.dmgTotal - dmgTotal;
      }
      dmgDisplay = x.dmgDisplay;
      dmgTotal = x.dmgTotal;
    }
    //On trie les DM supplémentaires selon leur type
    let dmgParType = {};
    otherDmg.forEach(function(d) {
      if (_.has(dmgParType, d.type)) dmgParType[d.type].push(d);
      else dmgParType[d.type] = [d];
    });
    // Dommages de même type que le principal, mais à part, donc non affectés par les critiques
    let mainDmgType = dmg.type;
    let dmgExtra = dmgParType[mainDmgType];
    if (dmgExtra && dmgExtra.length > 0 &&
      !immuniseAuType(target, mainDmgType, options.attaquant, options)) {
      if (dmgCoef > 1) dmgDisplay = "(" + dmgDisplay + ")";
      showTotal = true;
      let count = dmgExtra.length;
      dmgExtra.forEach(function(d) {
        count--;
        if (d.totalSave && d.totalSave.tempete && options.tempeteDeManaIntense) {
          d.totalSave.seuil += d.totalSave.tempete * options.tempeteDeManaIntense;
        }
        if (d.partialSave && d.partialSave.tempete && options.tempeteDeManaIntense) {
          d.partialSave.seuil += d.partialSave.tempete * options.tempeteDeManaIntense;
        }
        partialSave(d, target, false, d.display, d.total, expliquer, evt,
          function(res) {
            if (res) {
              dmgTotal += res.total;
              dmgDisplay += "+" + res.dmgDisplay;
            } else {
              dmgTotal += d.total;
              dmgDisplay += "+" + d.display;
            }
            if (count === 0) dealDamageAfterDmgExtra(target, mainDmgType, dmgTotal, dmgDisplay, showTotal, dmgParType, dmgExtra, crit, options, evt, expliquer, displayRes);
          });
      });
    } else {
      return dealDamageAfterDmgExtra(target, mainDmgType, dmgTotal, dmgDisplay, showTotal, dmgParType, dmgExtra, crit, options, evt, expliquer, displayRes);
    }
  }

  function getRDS(perso) {
    if (perso.rd) return perso.rd;
    let res = {
      rdt: 0,
      sauf: {}
    };
    if (attributeAsBool(perso, 'formeDArbre')) {
      res.sauf.feu_hache = res.sauf.feu_hache || 0;
      res.sauf.feu_hache += 10;
    }
    if (attributeAsBool(perso, 'armureDEau')) {
      res.acide = (res.acide || 0) + 5;
      res.feu = (res.feu || 0) + 5;
    }
    if (attributeAsBool(perso, 'protectionContreLesProjectiles')) {
      let protection =
        getIntValeurOfEffet(perso, 'protectionContreLesProjectiles', 5, 'protectionContreLesProjectiles');
      res.projectiles = (res.projectiles || 0) + protection;
    }
    let rd = ficheAttribute(perso, 'rd', ''); //TODO: que faire en cas de tranformation ?
    predicatesNamed(perso, 'bonus_RD').forEach(function(r) {
      if (rd === '') rd = r;
      else rd += ',' + r;
    });
    rd = (rd + '').trim();
    if (rd === '') {
      perso.rd = res;
      return res;
    }
    rd = rd.split(',');
    rd.forEach(function(r) {
      r = r.trim();
      if (r === '') return;
      let rds;
      let index = r.indexOf(':');
      if (index > 0) { //RD à un type particulier
        let type = r.substring(0, index);
        if (type == 'rdt' || type == 'sauf') return;
        if (type == 'magie') type = 'magique';
        rds = parseInt(r.substring(index + 1));
        if (isNaN(rds) || rds === 0) return;
        res[type] = res[type] || 0;
        res[type] += rds;
        return;
      }
      index = r.indexOf('/');
      if (index > 0) { //RD sauf à des types
        rds = parseInt(r.substring(0, index));
        if (isNaN(rds) || rds === 0) return;
        let sauf = r.substring(index + 1);
        if (sauf == 'magie') sauf = 'magique';
        res.sauf[sauf] = res.sauf[sauf] || 0;
        res.sauf[sauf] += rds;
        return;
      }
      //finalement, RD totale
      rds = parseInt(r);
      if (isNaN(rds) || rds === 0) return;
      res.rdt += rds;
    });
    perso.rd = res;
    return res;
  }

  // RD spécifique au type
  function typeRD(rd, dmgType) {
    if (dmgType === undefined || dmgType == 'normal') return 0;
    return (rd[dmgType] || 0);
  }

  function dmgNaturel(options) {
    if (options.nature) return true;
    if (options.artificiel) return false;
    let attaquant = options.attaquant;
    if (attaquant === undefined) return false;
    if (estAnimal(attaquant)) return true;
    if (predicateAsBool(attaquant, 'insecte')) return true;
    let creature = ficheAttribute(attaquant, 'creature', '');
    switch (creature) {
      case 'insecte':
      case 'ankheg':
      case 'araignée':
      case 'araignee':
      case 'guêpe':
      case 'libellule':
      case 'scarabée':
      case 'scorpion':
      case 'strige':
        return true;
      default:
        return false;
    }
  }

  //rds est un objet avec chaque champ sauf. 
  function applyRDSauf(rds, dmgType, total, display, options, target, showTotal, remainingRD) {
    options = options || {};
    let typeTrouve = function(t) {
      if (t == dmgType) return true;
      if (options[t]) return true;
      switch (t) {
        case 'tranchant':
        case 'contondant':
        case 'percant':
          return options.sortilege || dmgType != 'normal';
        default:
          return false;
      }
    };
    if (total) {
      for (let saufType in rds) {
        if (saufType == '1') break;
        let rd = rds[saufType];
        if (rd === 0) break;
        let types = saufType.split('_');
        if (types.find(typeTrouve)) break;
        if (target.ignoreMoitieRD) rd = parseInt(rd / 2);
        if (target.ignoreRD && rd > 0) {
          if (target.ignoreRD > rd) {
            target.ignoreRD -= rd;
            break;
          } else {
            rd -= target.ignoreRD;
            target.ignoreRD = 0;
          }
        }
        if (remainingRD) rd += remainingRD;
        if (total < rd) {
          display += " - " + total;
          rds[saufType] -= total;
          total = 0;
          showTotal = true;
        } else {
          display += " - " + rd;
          total -= rd;
          rds[saufType] = 0;
          showTotal = true;
        }
      }
    }
    return {
      total: total,
      display: display,
      showTotal: showTotal
    };
  }

  function mitigate(target, dmgType, divide, zero, multiply, expliquer, options) {
    //TODO: revoir ces effets
    let div = 1;
    if (!options.sortilege && attributeAsBool(target, 'flou')) {
      div++;
    }
    if (!options.energiePositive && dmgType != 'energie' && !options.spectral && predicateAsBool(target, 'creatureIntangible')) {
      div++;
    }
    if (options.attaqueMentale && predicateAsBool(target, 'bouclierPsi')) {
      div++;
    }
    if (options.aoe &&
      (predicateAsBool(target, 'protectionDMZone') ||
        predicateAsBool(target, 'protectionDMZone_' + dmgType))) {
      div++;
      expliquer(nomPerso(target) + " est protégé contre les dégâts de zone");
    }
    if (predicateOrAttributeAsBool(target, 'resistanceA_' + dmgType) || predicateAsBool(target, 'diviseEffet_' + dmgType)) {
      div++;
    }
    if (predicateOrAttributeAsBool(target, 'vulnerableA_' + dmgType)) {
      multiply();
    }
    if (predicateOrAttributeAsBool(target, 'resistanceA_nonMagique') && !options.magique && !options.sortilege) {
      div++;
    }
    if (predicateAsBool(target, 'generalVengeance')) {
      if (target.generalVengeance === undefined) {
        let pageId = target.token.get('pageid');
        let tokensContact = findObjs({
          _type: 'graphic',
          _subtype: 'token',
          _pageid: pageId,
          layer: 'objects'
        });
        tokensContact = tokensContact.filter(function(tok) {
          if (tok.id == target.token.id) return false;
          return distanceCombat(target.token, tok, pageId) === 0;
        });
        let gardeEliteContact = tokensContact.some(function(tok) {
          let p = persoOfToken(tok);
          if (!p) return;
          if (!isActive(p)) return;
          return predicateAsBool(p, 'gardeEliteVengeance');
        });
        target.generalVengeance = gardeEliteContact;
      }
      if (target.generalVengeance) div++;
    }
    if (estElementaire(dmgType)) {
      if (predicateAsBool(target, 'invulnerable') || predicateAsBool(target, 'diviseEffet_elementaire')) {
        if (!target.afficheInvulnerable) {
          target.afficheInvulnerable = true;
          expliquer(nomPerso(target) + " résiste aux éléments.");
        }
        div++;
      }
      switch (dmgType) {
        case 'froid':
          if (attributeAsBool(target, 'masqueMortuaire')) div++;
          if (attributeAsBool(target, 'mutationFourrureViolette')) div++;
          break;
        case 'feu':
          if (attributeAsBool(target, 'presenceGlaciale')) div++;
          if (attributeAsBool(target, 'mutationEcaillesRouges')) div++;
          break;
        case 'acide':
          if (attributeAsBool(target, 'mutationEcaillesRouges')) div++;
          break;
        case 'electrique':
          if (attributeAsBool(target, 'mutationFourrureViolette')) div++;
          break;
      }
    } else if (dmgType == 'poison' || dmgType == 'maladie') {
      if (predicateAsBool(target, 'invulnerable') ||
        predicateAsBool(target, 'creatureArtificielle') ||
        predicateAsBool(target, 'vegetatif') ||
        estNonVivant(target)) {
        zero();
      } else if (attributeAsBool(target, 'mutationSangNoir')) {
        div++;
      }
    } else {
      if (options.tranchant && predicateOrAttributeAsBool(target, 'resistanceA_tranchant')) {
        div++;
      } else if (options.percant && predicateOrAttributeAsBool(target, 'resistanceA_percant')) {
        div++;
      } else if (options.contondant && predicateOrAttributeAsBool(target, 'resistanceA_contondant')) {
        div++;
      }
      if (attributeAsBool(target, 'armureMagique')) {
        div++;
      }
      if (options.vampirise && predicateOrAttributeAsBool(target, 'controleSanguin')) {
        expliquer(nomPerso(target) + " contrôle parfaitement son sang");
        div++;
      }
    }
    if (options.attaquant && predicateAsBool(target, 'auDessusDeLaMelee')) {
      let na = ficheAttributeAsInt(options.attaquant, 'niveau', 1);
      let nc = ficheAttributeAsInt(target, 'niveau', 1);
      if (nc >= 2 * na) {
        if (!target.afficheAuDessusDeLaMelee) {
          target.afficheAuDessusDeLaMelee = true;
          expliquer(nomPerso(target) + " est au-dessus de la mêlée.");
        }
        div++;
      }
    }
    if (div > 1) divide(div);
  }

  //On a déterminé les DM du type principal(possiblement après save des dmgExtra, maintenant on applique les résistances, puis on ajoute les DM d'autres types
  function dealDamageAfterDmgExtra(target, mainDmgType, dmgTotal, dmgDisplay, showTotal, dmgParType, dmgExtra, crit, options, evt, expliquer, displayRes) {
    if (options.pointsVitaux && dmgTotal > 0) { //dégâts retardés pour une pression mortelle
      let pMortelle = tokenAttribute(target, 'pressionMortelle');
      let dmgPMort = dmgTotal;
      let numberPMort = 1;
      if (pMortelle.length > 0) {
        dmgPMort += pMortelle[0].get('current');
        numberPMort += pMortelle[0].get('max');
      }
      setTokenAttr(target, 'pressionMortelle', dmgPMort, evt, {
        maxVal: numberPMort
      });
      dmgTotal = 0;
    }
    let rd;
    let rdElems = 0;
    if (attributeAsBool(target, 'protectionContreLesElements')) {
      rdElems =
        getIntValeurOfEffet(target, 'protectionContreLesElements', 1, 'voieDeLaMagieElementaire') * 2;
      if (rdElems == 2) {
        let v = predicateAsInt(target, 'voieDeLaMagieElementaliste');
        if (v > 1) rdElems = 2 * v;
      }
    }
    if (dmgTotal > 0 && immuniseAuType(target, mainDmgType, options.attaquant, options)) {
      if (expliquer && !target['msgImmunite_' + mainDmgType]) {
        expliquer(nomPerso(target) + " ne semble pas affecté par " + stringOfType(mainDmgType));
        target['msgImmunite_' + mainDmgType] = true;
      }
      dmgTotal = 0;
      dmgDisplay = '0';
      showTotal = false;
    } else if (!target.ignoreTouteRD) {
      rd = getRDS(target);
      let rdMain = typeRD(rd, mainDmgType);
      if (mainDmgType == 'normal') {
        if (options.tranchant && rd.tranchant) rdMain += rd.tranchant;
        if (options.percant && rd.percant) rdMain += rd.percant;
        if (options.contondant && rd.contondant) rdMain += rd.contondant;
      } else if ((mainDmgType == 'poison' || mainDmgType == 'feu' || mainDmgType == 'froid') && !options.magique && rd.nature && !dmgNaturel(options)) {
        rdMain += rd.nature;
      }
      if (options.asphyxie) rdMain += rd.asphyxie;
      if (rd.drain && (options.vampirise || target.vampirise) && mainDmgType != 'drain') {
        rdMain += rd.drain;
      }
      if (options.hache && rd.hache) {
        rdMain += rd.hache;
      }
      if (target.ignoreMoitieRD) rdMain = parseInt(rdMain / 2);
      if (target.ignoreRD) {
        if (target.ignoreRD > rdMain) {
          target.ignoreRD -= rdMain;
          rdMain = 0;
        } else {
          rdMain -= target.ignoreRD;
          target.ignoreRD = 0;
        }
      }
      if (rdMain > 0 && dmgTotal > 0) {
        dmgTotal -= rdMain;
        if (dmgTotal < 0) {
          rdMain += dmgTotal;
          dmgTotal = 0;
        }
        dmgDisplay += " - " + rdMain;
        showTotal = true;
      }
      if (rd.elementaire) rdElems += rd.elementaire;
      if (target.ignoreMoitieRD) rdElems = parseInt(rdElems / 2);
      if (rdElems > 0 && dmgTotal > 0 && estElementaire(mainDmgType)) {
        if (dmgTotal > rdElems) {
          dmgDisplay += ' - ' + rdElems;
          dmgTotal -= rdElems;
          rdElems = 0;
        } else {
          dmgDisplay += ' - ' + dmgTotal;
          rdElems -= dmgTotal;
          dmgTotal = 0;
        }
      }
      let additionalType = {
        magique: options.magique,
        tranchant: options.tranchant,
        percant: options.percant,
        contondant: options.contondant,
        sortilege: options.sortilege,
        hache: options.hache,
        ferFroid: options.ferFroid,
        adamantium: options.adamantium,
        beni: options.beni
      };
      let remainingRD = 0;
      if (rdMain < 0) remainingRD = rdMain;
      let resSauf = applyRDSauf(rd.sauf, mainDmgType, dmgTotal, dmgDisplay, additionalType, target, showTotal, remainingRD);
      dmgTotal = resSauf.total;
      dmgDisplay = resSauf.display;
      showTotal = resSauf.showTotal;
    }
    // Damage mitigaters for main damage
    mitigate(target, mainDmgType,
      function(div) {
        div = div || 2;
        dmgTotal = Math.ceil(dmgTotal / div);
        if (dmgExtra) dmgDisplay = "(" + dmgDisplay + ")";
        dmgDisplay += " / " + div;
        showTotal = true;
      },
      function() {
        if (dmgTotal > 0) {
          dmgDisplay += '-' + dmgTotal;
          dmgTotal = 0;
        }
      },
      function() {
        dmgTotal = Math.floor(dmgTotal * 1.5);
        if (dmgExtra) dmgDisplay = "(" + dmgDisplay + ")";
        dmgDisplay += " x 1.5";
        showTotal = true;
      },
      expliquer, options);
    let dmSuivis = {
      drain: 0
    }; //si il faut noter les DMs d'un type particulier
    if (mainDmgType == 'drain') dmSuivis.drain = dmgTotal;
    predicatesNamed(target, 'vitaliteSurnaturelle').forEach(function(a) {
      if (typeof a != "string") return;
      let indexType = a.indexOf('/');
      if (indexType < 0 || indexType == a.length) return;
      a = a.substring(indexType + 1);
      let typeVitalite = a.split(',');
      typeVitalite.forEach(function(tv) {
        if (tv == mainDmgType) dmSuivis[tv] = dmgTotal;
        else dmSuivis[tv] = 0;
      });
    });
    // Autres sources de dégâts
    // On compte d'abord les autres sources, pour la synchronisation
    let count = 0;
    for (let dt in dmgParType) {
      if (immuniseAuType(target, dt, options.attaquant, options)) {
        if (expliquer && !target['msgImmunite_' + dt]) {
          expliquer(nomPerso(target) + " ne semble pas affecté par " + stringOfType(dt));
          target['msgImmunite_' + dt] = true;
        }
        delete dmgParType[dt];
      } else
        count += dmgParType[dt].length;
    }
    let critOther = crit && reglesOptionelles.dommages.val.crit_elementaire.val;
    let dealOneType = function(dmgType) {
      if (dmgType == mainDmgType) {
        count -= dmgParType[dmgType].length;
        if (count === 0) dealDamageAfterOthers(target, crit, options, evt, expliquer, displayRes, dmgTotal, dmgDisplay, showTotal, dmSuivis);
        return; //type principal déjà géré
      }
      showTotal = true;
      let dm = 0;
      let typeDisplay = "";
      let typeCount = dmgParType[dmgType].length;
      dmgParType[dmgType].forEach(function(d) {
        if (d.totalSave && d.totalSave.tempete && options.tempeteDeManaIntense) {
          d.totalSave.seuil += d.totalSave.tempete * options.tempeteDeManaIntense;
        }
        if (d.partialSave && d.partialSave.tempete && options.tempeteDeManaIntense) {
          d.partialSave.seuil += d.partialSave.tempete * options.tempeteDeManaIntense;
        }
        partialSave(d, target, false, d.display, d.total, expliquer, evt,
          function(res) {
            let addTypeDisplay = d.display;
            if (res) {
              dm += res.total;
              if (critOther) {
                dm += res.total;
                if (options.memePasMal) options.memePasMal += res.total;
              }
              addTypeDisplay = res.dmgDisplay;
            } else {
              dm += d.total;
              if (critOther) {
                dm += d.total;
                if (options.memePasMal) options.memePasMal += d.total;
              }
            }
            if (critOther) addTypeDisplay = '(' + addTypeDisplay + ') x2';
            if (typeDisplay === '') typeDisplay = addTypeDisplay;
            else typeDisplay += "+" + addTypeDisplay;
            typeCount--;
            if (typeCount === 0) {
              if (!target.ignoreTouteRD) {
                rd = rd || getRDS(target);
                let rdl = typeRD(rd, dmgType);
                if (dmgType == 'normal') {
                  if (options.tranchant && rd.tranchant) rdl += rd.tranchant;
                  if (options.percant && rd.percant) rdl += rd.percant;
                  if (options.contondant && rd.contondant) rdl += rd.contondant;
                } else if ((dmgType == 'poison' || dmgType == 'feu' || dmgType == 'froid') && !options.magique && rd.nature && !dmgNaturel(options)) {
                  rdl += rd.nature;
                }
                if (target.ignoreMoitieRD) rdl = parseInt(rdl / 2);
                if (target.ignoreRD) {
                  if (target.ignoreRD > rdl) {
                    target.ignoreRD -= rdl;
                    rdl = 0;
                  } else {
                    rdl -= target.ignoreRD;
                    target.ignoreRD = 0;
                  }
                }
                if (rdl > 0 && dm > 0) {
                  dm -= rdl;
                  if (dm < 0) {
                    rdl += dm;
                    dm = 0;
                  }
                  typeDisplay += "-" + rdl;
                }
                if (rdElems > 0 && dm > 0 && estElementaire(dmgType)) {
                  if (dm > rdElems) {
                    typeDisplay += ' - ' + rdElems;
                    dm -= rdElems;
                    rdElems = 0;
                  } else {
                    typeDisplay += ' - ' + dm;
                    rdElems -= dm;
                    dm = 0;
                  }
                }
                let additionalType = {
                  sortilege: options.sortilege,
                  magique: options.magique
                };
                let resSauf = applyRDSauf(rd.sauf, dmgType, dm, typeDisplay, additionalType, target);
                dm = resSauf.total;
                typeDisplay = resSauf.display;
                mitigate(target, dmgType,
                  function(div) {
                    div = div || 2;
                    dm = Math.ceil(dm / div);
                    if (dmgParType[dmgType].length > 1) typeDisplay = "(" + typeDisplay + ")";
                    typeDisplay += " / " + div;
                  },
                  function() {
                    if (dm > 0) {
                      typeDisplay += "-" + dm;
                      dm = 0;
                    }
                  },
                  function() {
                    dm = Math.floor(dm * 1.5);
                    if (dmgParType[dmgType].length > 1) typeDisplay = "(" + typeDisplay + ")";
                    typeDisplay += " x 1.5";
                  },
                  expliquer, options);
                dmgTotal += dm;
                dmgDisplay += "+" + typeDisplay;
                if (_.has(dmSuivis, dmgType)) {
                  dmSuivis[dmgType] = dm;
                }
              }
            }
            count--;
            if (count === 0) dealDamageAfterOthers(target, crit, options, evt, expliquer, displayRes, dmgTotal, dmgDisplay, showTotal, dmSuivis);
          });
      });
    };
    if (count > 0) {
      for (let dmgType in dmgParType) {
        dealOneType(dmgType);
      }
    } else {
      return dealDamageAfterOthers(target, crit, options, evt, expliquer, displayRes, dmgTotal, dmgDisplay, showTotal, dmSuivis);
    }
  }

  function dealDamageAfterOthers(target, crit, options, evt, expliquer, displayRes, dmgTotal, dmgDisplay, showTotal, dmSuivis) {
    const charId = target.charId;
    let token = target.token;
    // Now do some dmg mitigation rolls, if necessary
    if ((options.distance || options.aoe) &&
      attributeAsBool(target, 'aCouvert')) {
      if (showTotal) dmgDisplay = "(" + dmgDisplay + ")";
      dmgDisplay += " / 2";
      dmgTotal = Math.ceil(dmgTotal / 2);
      dmSuivis = _.map(dmSuivis, function(d) {
        return Math.ceil(d / 2);
      });
      showTotal = true;
    }
    if (options.totalSave && options.totalSave.tempete && options.tempeteDeManaIntense) {
      options.totalSave.seuil += options.totalSave.tempete * options.tempeteDeManaIntense;
    }
    if (options.partialSave && options.partialSave.tempete && options.tempeteDeManaIntense) {
      options.partialSave.seuil += options.partialSave.tempete * options.tempeteDeManaIntense;
    }
    partialSave(options, target, showTotal, dmgDisplay, dmgTotal,
      expliquer, evt,
      function(saveResult) {
        if (saveResult) {
          if (saveResult.total < dmgTotal) {
            dmgTotal = saveResult.total;
            dmSuivis = _.map(dmSuivis, function(d) {
              return Math.ceil(d / 2);
            });
          }
          dmgDisplay = saveResult.dmgDisplay;
          showTotal = saveResult.showTotal;
        }
        let rdTarget = getRDS(target);
        let rd = rdTarget.rdt || 0;
        if (!target.perteDeSubstance && options.attaquant && predicateAsBool(target, 'ancreInvincible')) {
          if (predicateAsBool(options.attaquant, 'dragonInvincble')) {
            rd += 10;
            target.messages.push("Ancre contre le dragon => +10 RD");
          } else if (predicateAsBool(options.attaquant, 'emissaireDuDragonInvincible')) {
            rd += 5;
            target.messages.push("Ancre contre émissaire du dragon => +5 RD");
          }
        }
        if (rd > 0 && !options.aoe && options.attaquant && predicateAsBool(options.attaquant, 'ventreMou')) {
          let taille = taillePersonnage(target, 4);
          if (taille > 4) {
            if (target.messages) target.messages.push("Ventre mou => L'attaque ignore la RD dûe à la taille");
            rd -= 3 * (taille - 4);
            if (taille > 6) rd--;
            if (rd < 0) rd = 0;
          }
        }
        if (predicateAsBool(target, 'hausserLeTon')) {
          if (parseInt(target.token.get('bar1_value')) <= target.token.get('bar1_max') / 2) {
            rd += 5;
          }
        }
        if (target.attaquant && predicateAsBool(target, 'combatKinetique') &&
          !getState(target, 'endormi') && !getState(target, 'assomme') &&
          !getState(target, 'mort') && !getState(target, 'surpris') &&
          !getState(target, 'etourdi')) {
          rd += 3;
        }
        if (attributeAsBool(target, 'statueDeBois')) rd += 10;
        else if (attributeAsBool(target, 'petrifie')) rd += 20;
        if (attributeAsBool(target, 'mutationSilhouetteMassive')) rd += 3;
        if (crit) {
          let rdCrit = predicateAsInt(target, 'RD_critique', 0); //pour la compatibilité
          if (ficheAttributeAsBool(target, 'casque_on', false))
            rdCrit += ficheAttributeAsInt(target, 'casque_rd', 0);
          rd += rdCrit;
          if (options.memePasMal) options.memePasMal -= rdCrit;
        }
        if (options.distance) {
          if (rdTarget.distance) rd += rdTarget.distance;
          let piqures = predicateAsInt(target, 'piquresDInsectes', 0);
          if (piqures > 0) {
            if (persoEstPNJ(target) || (ficheAttributeAsBool(target, 'defarmureon', false) && ficheAttributeAsInt(target, 'defarmure', 0) > 5)) {
              rd += piqures;
            }
          }
          if (!options.sortilege && rdTarget.projectiles)
            rd += rdTarget.projectiles;
        }
        if (attributeAsBool(target, 'masqueMortuaire')) rd += 2;
        if (attributeAsBool(target, 'masqueMortuaireAmeLiee')) rd += 1;
        if (rdTarget.nature > 0 && dmgNaturel(options)) rd += rdTarget.nature;
        if (dmgTotal > rd && rdTarget.sauf[1]) {
          if (dmgTotal > rd + rdTarget.sauf[1]) rd += rdTarget.sauf[1];
          else rd = dmgTotal - 1;
        }
        if (target.defautCuirasse) rd = 0;
        if (options.intercepter) rd += options.intercepter;
        if (target.intercepter) rd += target.intercepter;
        if (target.extraRD) {
          rd += target.extraRD;
          expliquer(nomPerso(target) + " encaisse le coup avec son armure");
        }
        if (target.extraRDBouclier) {
          rd += target.extraRDBouclier;
          expliquer(nomPerso(target) + " dévie le coup avec son bouclier");
        }
        if (target.ignoreTouteRD) rd = 0;
        else if (target.ignoreMoitieRD) rd = parseInt(rd / 2);
        if (target.ignoreRD) {
          if (target.ignoreRD > rd) {
            target.ignoreRD -= rd;
            rd = 0;
          } else {
            rd -= target.ignoreRD;
            target.ignoreRD = 0;
          }
        }
        //Option Max Rune de Protection
        if (target.utiliseRuneProtectionMax) {
          target.messages.push(nomPerso(target) + " utilise sa Rune de Protection");
          addToAttributeAsInt(target, 'limiteParCombat_runeForgesort_protection', 1, -1, evt);
          rd += target.utiliseRuneProtectionMax;
          if (dmgTotal <= rd) expliquer("La rune de protection absorbe tous les dommages");
          else expliquer("La rune de protection encaisse " + target.utiliseRuneProtectionMax + " dommages");
        }
        //RD PeauDePierre à prendre en compte en dernier
        if (!target.defautCuirasse && !target.ignoreTouteRD && rd < dmgTotal && attributeAsBool(target, 'peauDePierreMag')) {
          let peauDePierreMagValeur = tokenAttribute(target, 'peauDePierreMagValeur');
          if (peauDePierreMagValeur.length === 0) {
            error("compteur de Peau de Pierre non trouvé", target);
          } else {
            peauDePierreMagValeur = peauDePierreMagValeur[0];
            let rdPeauDePierreMax = parseInt(peauDePierreMagValeur.get('current'));
            let peauDePierreAbsorbe = parseInt(peauDePierreMagValeur.get('max'));
            if (isNaN(rdPeauDePierreMax) || isNaN(peauDePierreAbsorbe) || rdPeauDePierreMax < 1 || peauDePierreAbsorbe < 1) {
              error("compteur de Peau de Pierre mal formé", peauDePierreMagValeur);
              finDEffetDeNom(target, "peauDePierreMag", evt);
            } else {
              let rdPeauDePierreMag = rdPeauDePierreMax;
              if (target.ignoreMoitieRD) rdPeauDePierreMag = parseInt(rdPeauDePierreMag / 2);
              if (rd + rdPeauDePierreMag > dmgTotal) {
                rdPeauDePierreMag = dmgTotal - rd;
              }
              if (rdPeauDePierreMag >= peauDePierreAbsorbe) {
                rdPeauDePierreMag = peauDePierreAbsorbe;
                finDEffetDeNom(target, "peauDePierreMag", evt);
              } else {
                peauDePierreAbsorbe -= rdPeauDePierreMag;
                evt.attributes = evt.attributes || [];
                evt.attributes.push({
                  attribute: peauDePierreMagValeur,
                  current: rdPeauDePierreMax,
                  max: peauDePierreAbsorbe
                });
                peauDePierreMagValeur.set('max', peauDePierreAbsorbe);
              }
              rd += rdPeauDePierreMag;
            }
          }
        }
        if (rd > 0) {
          if (showTotal) dmgDisplay = "(" + dmgDisplay + ") - " + rd;
          else {
            dmgDisplay += " - " + rd;
            showTotal = true;
          }
        }
        dmgTotal -= rd;
        for (const dmSuiviType in dmSuivis) {
          if (rd === 0) break;
          dmSuivis[dmSuiviType] -= rd;
          if (dmSuivis[dmSuiviType] < 0) {
            rd = -dmSuivis[dmSuiviType];
            dmSuivis[dmSuiviType] = 0;
          } else rd = 0;
        }
        if (options.metal && attributeAsBool(target, 'magnetisme')) {
          if (showTotal) dmgDisplay = "(" + dmgDisplay + ") / 2";
          else dmgDisplay += " / 2";
          showTotal = true;
          dmgTotal = Math.ceil(dmgTotal / 2);
          if (options.memePasMal)
            options.memePasMal = Math.ceil(options.memePasMal / 2);
          dmSuivis = _.map(dmSuivis, function(d) {
            return Math.ceil(d / 2);
          });
        }
        if (predicateAsBool(target, 'commandant')) {
          //On cherche si il y a au moins 4 créatures sous ses ordres à moins de 10 m
          let pageId = target.token.get('pageid');
          let tokens =
            findObjs({
              _type: 'graphic',
              _subtype: 'token',
              layer: 'objects',
              _pageid: pageId
            });
          let nbCreatures = 0;
          tokens.forEach(function(tok) {
            if (tok.id === target.token.id) return;
            let ci = tok.get('represents');
            if (ci === '') return;
            if (distanceCombat(tok, target.token, pageId) > 10) return;
            let attrCom = charAttribute(ci, 'capitaine');
            if (attrCom.length === 0) return;
            let capitaine = persoOfIdName(attrCom[0].get('current'), pageId);
            if (!capitaine || capitaine.token.id != target.token.id) return;
            let perso = {
              token: tok,
              charId: ci
            };
            if (isActive(perso)) nbCreatures++;
          });
          if (nbCreatures > 3) {
            if (showTotal) dmgDisplay = "(" + dmgDisplay + ") / 2";
            else dmgDisplay += " / 2";
            showTotal = true;
            dmgTotal = Math.ceil(dmgTotal / 2);
            if (options.memePasMal)
              options.memePasMal = Math.ceil(options.memePasMal / 2);
            dmSuivis = _.map(dmSuivis, function(d) {
              return Math.ceil(d / 2);
            });
          }
        }
        if (dmgTotal < reglesOptionelles.dommages.val.dm_minimum.val) {
          dmgTotal = reglesOptionelles.dommages.val.dm_minimum.val;
          dmgDisplay += "-> " + reglesOptionelles.dommages.val.dm_minimum.val;
        }
        if (options.divise) {
          dmgTotal = Math.ceil(dmgTotal / options.divise);
          if (options.memePasMal)
            options.memePasMal = Math.ceil(options.memePasMal / options.divise);
          dmSuivis = _.map(dmSuivis, function(d) {
            return Math.ceil(d / options.divise);
          });
          dmgDisplay = "(" + dmgDisplay + ")/" + options.divise;
          showTotal = true;
        }
        if (crit && options.memePasMal && options.memePasMal > 0) {
          dmgTotal -= options.memePasMal;
          if (dmgTotal < 0) {
            options.memePasMal += dmgTotal;
            dmgTotal = 0;
          }
          expliquer("Même pas mal : ignore " + options.memePasMal + " PVs et peut enrager");
          let mpm = attributeAsInt(target, 'memePasMalIgnore', 0);
          setTokenAttr(target, 'memePasMalIgnore', mpm + options.memePasMal, evt);
          setAttrDuree(target, 'memePasMalBonus', 3, evt);
        }
        // calcul de l'effet sur la cible
        let bar1 = parseInt(token.get('bar1_value'));
        let pvmax = parseInt(token.get('bar1_max'));
        if (isNaN(bar1)) {
          error("Pas de points de vie chez la cible", token);
          bar1 = 0;
          pvmax = 0;
        } else if (isNaN(pvmax)) {
          pvmax = bar1;
          token.set('bar1_max', bar1);
        }
        let hasMana = (ficheAttributeAsInt(target, 'PM', 0) > 0);
        let tempDmg = 0;
        const estMook = token.get('bar1_link') === '';
        if (hasMana) {
          if (estMook) tempDmg = attributeAsInt(target, 'DMTEMP', 0);
          else tempDmg = ficheAttributeAsInt(target, 'DMTEMP', 0);
        } else {
          tempDmg = parseInt(token.get('bar2_value'));
          if (isNaN(tempDmg)) {
            if (target.tempDmg) { //then try to set bar2 correctly
              if (estMook) {
                token.set("bar2_max", pvmax);
              } else {
                let tmpHitAttr =
                  findObjs({
                    _type: "attribute",
                    _characterid: charId,
                    name: 'DMTEMP'
                  }, {
                    caseInsensitive: true
                  });
                let dmTemp;
                if (tmpHitAttr.length === 0) {
                  dmTemp =
                    createObj('attribute', {
                      characterid: charId,
                      name: 'DMTEMP',
                      current: 0,
                      max: pvmax
                    });
                } else {
                  dmTemp = tmpHitAttr[0];
                }
                token.set("bar2_max", pvmax);
                token.set("bar2_link", dmTemp.id);
              }
            }
            tempDmg = 0;
          }
        }
        if (!options.aoe && dmgTotal > 1 && predicateAsBool(target, 'ciblesMultiples')) {
          showTotal = true;
          dmgTotal = 1;
          if (dmSuivis.drain && dmSuivis.drain > 0) dmSuivis.drain = 1;
          expliquer("La nuée est constituée de très nombreuses cibles, l'attaque ne lui fait qu'1 DM");
        }
        if (options.attaquant && options.arme && dmgTotal > 0 &&
          predicateAsBool(options.attaquant, 'blessureSanglante') &&
          !estMortVivant(target)) {
          let ef = {
            effet: 'blessureSanglante',
            duree: true,
            message: messageEffetTemp.blessureSanglante,
            attaquant: options.attaquant,
          };
          setEffetTemporaire(target, ef, predicateAsInt(options.attaquant, 'blessureSanglante', 0, 1), evt, {});
        }
        let pvPerdus = dmgTotal;
        if (pvPerdus > 0 && attributeAsBool(target, 'dominationPsy') && isActive(target)) {
          let saveId = 'saveDMDominationPsy_' + target.token.id;
          let seuil = getIntValeurOfEffet(target, 'dominationPsy', 10);
          let s = {
            carac: 'SAG',
            seuil
          };
          let expliquer = function(msg) {
            sendPerso(target, msg);
          };
          let sujet = onGenre(target, 'il', 'elle');
          let saveOpts = {
            msgPour: " pour se libérer de la domination",
            msgReussite: ", " + sujet + " se libère de la domination",
            msgRate: ", " + sujet + " reste sous domination malgré les dégâts",
            rolls: options.rolls,
            chanceRollId: options.chanceRollId
          };
          setTimeout(_.bind(save, undefined, s, target, saveId, expliquer, saveOpts, evt,
              function(reussite, texte) { //asynchrone
                if (reussite) {
                  removeTokenAttr(target, 'dominationPsy', evt);
                  removeTokenAttr(target, 'dominationPsyValeur', evt);
                }
              }),
            2000);
        }
        if (target.tempDmg) {
          tempDmg += dmgTotal;
          if (tempDmg > pvmax) {
            pvPerdus -= tempDmg - pvmax;
            tempDmg = pvmax;
          }
          if (hasMana) {
            setTokenAttr(target, 'DMTEMP', tempDmg, evt);
          } else {
            updateCurrentBar(target, 2, tempDmg, evt);
          }
        } else {
          //On enlève les points de vie
          let pvTemporaires = attributeAsInt(target, 'PVTemporaires', 0);
          let pvTemp2 = attributeAsInt(target, 'PVTempChangementDeForme', 0);
          if (bar1 > 0 && bar1 + pvTemporaires + pvTemp2 <= dmgTotal &&
            predicateAsBool(target, 'instinctDeSurvieHumain')) {
            dmgTotal = Math.floor(dmgTotal / 2);
            dmSuivis = _.map(dmSuivis, function(d) {
              return Math.ceil(d / 2);
            });
            if (dmgTotal < 1) dmgTotal = 1;
            if (showTotal) {
              dmgDisplay = "(" + dmgDisplay + ") / 2";
            } else {
              dmgDisplay += " / 2";
              showTotal = true;
            }
            expliquer("L'instinct de survie aide à réduire une attaque fatale");
          }
          pvPerdus = dmgTotal;
          if (pvTemp2 > 0) {
            if (pvTemp2 <= dmgTotal) {
              removeTokenAttr(target, 'PVTempChangementDeForme', evt);
              expliquer(nomPerso(target) + " perd tous ses PVs de transformation");
              bar1 = bar1 - dmgTotal + pvTemp2;
            } else {
              setTokenAttr(target, 'PVTempChangementDeForme', pvTemp2 - dmgTotal, evt);
              expliquer(nomPerso(target) + " perd " + dmgTotal + " PVs de transformation");
            }
          }
          if (pvTemporaires > 0) {
            if (pvTemporaires <= dmgTotal - pvTemp2) {
              removeTokenAttr(target, 'PVTemporaires', evt);
              expliquer(nomPerso(target) + " perd tous ses PVs temporaires");
              bar1 = bar1 - dmgTotal + pvTemporaires + pvTemp2;
            } else {
              setTokenAttr(target, 'PVTemporaires', pvTemporaires - dmgTotal, evt);
              expliquer(nomPerso(target) + " perd " + dmgTotal + " PVs temporaires");
            }
          } else {
            bar1 = bar1 - dmgTotal;
          }
          if (crit) { //Vulnérabilité aux critiues
            let vulnerableCritique = predicateAsInt(target, 'vulnerableCritique', 0);
            if (vulnerableCritique > 0) {
              if (randomInteger(100) <= vulnerableCritique) {
                expliquer("Le coup critique le fait voler en éclats");
                if (bar1 > 0) {
                  dmgTotal += bar1;
                  pvPerdus += bar1;
                  bar1 = 0;
                }
              } else {
                expliquer("Le coup critique fait vibrer l'adversaire, mais il résiste.");
              }
            }
          }
          if ((crit || bar1 < pvmax / 2) &&
            predicateAsBool(target, 'peutEnrager') &&
            !attributeAsBool(target, 'enrage')) {
            setTokenAttr(target, 'enrage', true, evt);
            expliquer(nomPerso(target) + " devient enragé" + eForFemale(target) + ".");
            finDEffetDeNom(target, 'apeureTemp', evt);
            finDEffetDeNom(target, 'peurEtourdi', evt);
            setState(target, 'apeure', false, evt);
          }
          if (bar1 <= 0) {
            let attrFDA = tokenAttribute(target, 'formeDArbre');
            if (attrFDA.length > 0) {
              let effetFDA = finDEffet(attrFDA[0], 'formeDArbre', attrFDA[0].get('name'), charId, evt, {
                pageId: token.get('pageid')
              });
              if (effetFDA && effetFDA.newToken) {
                token = effetFDA.newToken;
                target.token = token;
              }
              let newBar1 = parseInt(token.get('bar1_value'));
              if (isNaN(newBar1) || newBar1 < 0) {
                error("Points de vie de l'ancien token incorrects", newBar1);
              } else {
                bar1 += newBar1;
              }
            }
          }
          //On enregistre les dm suivis
          for (let dmType in dmSuivis) {
            let d = dmSuivis[dmType];
            if (d && dmType != 'drain') {
              let attrDmSuivi = tokenAttribute(target, 'DMSuivis' + dmType);
              if (attrDmSuivi.length > 0) {
                let cd = parseInt(attrDmSuivi[0].get('current'));
                if (cd > 0) d += cd;
                attrDmSuivi[0].set('current', d);
                evt.attributes = evt.attributes || [];
                evt.attributes.push({
                  attribute: attrDmSuivi[0],
                  current: cd
                });
              } else {
                setTokenAttr(target, 'DMSuivis' + dmType, d, evt);
              }
            }
          }
          if (bar1 <= 0) {
            if (predicateAsBool(target, 'sergent') &&
              !attributeAsBool(target, 'attributDeCombat_sergentUtilise')) {
              expliquer(nomPerso(target) + " évite l'attaque in-extremis");
              setTokenAttr(target, 'attributDeCombat_sergentUtilise', true, evt);
              pvPerdus = 0;
            } else if (target.attackRoll &&
              predicateAsBool(target, 'increvableHumain') &&
              !attributeAsBool(target, 'increvableHumainUtilise')) {
              setTokenAttr(target, 'increvableHumainUtilise', true, evt);
              let weaponStatsIncrevable = {
                attSkillDiv: 0,
                crit: 20,
                parDefaut: true,
              };
              if (options.sortilege) {
                weaponStatsIncrevable.name = "Attaque magique";
                weaponStatsIncrevable.attSkill = '@{ATKMAG}';
              } else if (options.contact) {
                let enMain = armesEnMain(target);
                if (!enMain || enMain.sortilege || enMain.portee > 0) {
                  weaponStatsIncrevable.name = "Attaque au contact";
                  weaponStatsIncrevable.attSkill = '@{ATKCAC}';
                } else {
                  weaponStatsIncrevable = enMain;
                }
              } else { //attaque à distance
                weaponStatsIncrevable.name = "Attaque à distance";
                weaponStatsIncrevable.attSkill = '@{ATKTIR}';
              }
              let optionsIncrevable = {...options
              };
              optionsIncrevable.pasDeDmg = true;
              let diceOptions =
                computeAttackDiceOptions(target, weaponStatsIncrevable, expliquer, evt, optionsIncrevable);
              let toEvaluateAttackIncrevable =
                attackExpression(target, diceOptions, weaponStatsIncrevable);
              sendChat('', toEvaluateAttackIncrevable, function(resAttackIncrevable) {
                let rollsAttack = resAttackIncrevable[0];
                let afterEvaluateAttack = rollsAttack.content.split(' ');
                let attRollNumber = rollNumber(afterEvaluateAttack[0]);
                let attSkillNumber = rollNumber(afterEvaluateAttack[1]);
                let d20roll = rollsAttack.inlinerolls[attRollNumber].results.total;
                let attSkill = rollsAttack.inlinerolls[attSkillNumber].results.total;
                parseWeaponStatsOptions(target, options.attaquant, weaponStatsIncrevable, undefined, optionsIncrevable);
                let explications = [];
                let attBonus =
                  bonusAttaqueA(target, weaponStatsIncrevable, evt, explications, optionsIncrevable);
                let pageId = options.pageId || token.get('pageid');
                attBonus +=
                  bonusAttaqueD(target, target.attaquant, 0, pageId, evt, explications, optionsIncrevable);
                let attackRollAttaquant = d20roll + attSkill + attBonus;
                let attRollValue = buildinline(rollsAttack.inlinerolls[attRollNumber]);
                attRollValue += (attSkill > 0) ? "+" + attSkill : (attSkill < 0) ? attSkill : "";
                attRollValue += (attBonus > 0) ? "+" + attBonus : (attBonus < 0) ? attBonus : "";
                let msgIncrevable = "Increvable : " + nomPerso(target) + " fait " + attRollValue;
                //TODO: afficher les explications de calcul des bonus d'attaque ?
                if (attackRollAttaquant < target.attackRoll) {
                  expliquer(msgIncrevable + " < " + target.attackRoll + " => échec ");
                  prendreUnCoupMortel(target, dmgTotal, pvPerdus, bar1, pvmax, tempDmg, dmgDisplay, showTotal, dmSuivis.drain, displayRes, options, evt, expliquer);
                  return;
                }
                //L'attaque est évitée
                expliquer(msgIncrevable + " > " + target.attackRoll + " => l'attaque est évitée ! ");
                postBarUpdateForDealDamage(target, dmgTotal, 0, bar1, tempDmg, dmgDisplay, showTotal, dmSuivis.drain, displayRes, evt, expliquer);
              });
              return;
            } else { //la cible prend le coup
              prendreUnCoupMortel(target, dmgTotal, pvPerdus, bar1, pvmax, tempDmg, dmgDisplay, showTotal, dmSuivis.drain, displayRes, options, evt, expliquer);
              //La suite est fait en continuation car la fonction est asynchrone
              return;
            }
          } else { // bar1>0
            updateCurrentBar(target, 1, bar1, evt);
          }
        }
        postBarUpdateForDealDamage(target, dmgTotal, pvPerdus, bar1, tempDmg, dmgDisplay, showTotal, dmSuivis.drain, displayRes, evt, expliquer);
      });
    return dmgDisplay;
  }


  // Les soins ------------------------------------------------------------------

  //fonction avec callback, mais synchrone
  // n'ajoute pas evt à l'historique
  // options:
  // - saufDMTYpe
  // - recuperation
  function soigneToken(perso, soins, evt, callTrue, callMax, options) {
    options = options || {};
    let token = perso.token;
    let bar1 = parseInt(token.get('bar1_value'));
    let pvmax = parseInt(token.get('bar1_max'));
    if (isNaN(bar1) || isNaN(pvmax)) {
      error("Soins sur un token sans points de vie", token);
      if (callMax) callMax();
      return;
    }
    let updateBar1;
    if (bar1 >= pvmax) bar1 = pvmax;
    else updateBar1 = true;
    if (soins < 0) soins = 0;
    if (predicateAsBool(perso, 'vitaliteEpique')) soins *= 2;
    let nonSoignable = 0;
    //Update des dm suivis
    let attrs = findObjs({
      _type: 'attribute',
      _characterid: perso.charId,
    });
    let regSuivis = '^DMSuivis([^_]+)';
    let link = token.get('bar1_link');
    if (link === '') regSuivis += "_" + token.get('name') + '$';
    else regSuivis += '$';
    regSuivis = new RegExp(regSuivis);
    let soinsSuivis = soins;
    let soinsImpossible = new Set(options.saufDMType);
    attrs.forEach(function(a) {
      if (soinsSuivis === 0) return;
      let an = a.get('name');
      an = an.match(regSuivis);
      if (an && an.length > 0) {
        let ds = parseInt(a.get('current'));
        if (ds > 0) {
          if (an[0].length < 2) {
            error("Match non trouvé pour les soins", an);
            return;
          }
          if (soinsImpossible.has(an[1])) {
            nonSoignable += ds;
          } else {
            if (ds > soinsSuivis) {
              evt.attributes = evt.attributes || [];
              evt.attributes.push({
                attribute: a,
                current: ds
              });
              ds -= soinsSuivis;
              a.set('current', ds);
              soinsSuivis = 0;
            } else {
              soinsSuivis -= ds;
              ds = 0;
            }
          }
        } else ds = 0;
        if (ds === 0) {
          evt.deletedAttributes = evt.deletedAttributes || [];
          evt.deletedAttributes.push(a);
          a.remove();
        }
      }
    });
    pvmax -= nonSoignable;
    if (pvmax <= 0) {
      if (callMax) callMax();
      return;
    }
    if (bar1 === 0) {
      if (attributeAsBool(perso, 'etatExsangue')) {
        removeTokenAttr(perso, 'etatExsangue', evt, {
          msg: "retrouve des couleurs"
        });
      } else if (getState(perso, 'mort')) {
        setState(perso, 'renverse', true, evt);
        setState(perso, 'mort', false, evt);
      }
    }
    if (predicateAsBool(perso, 'vieArtificielle')) {
      soins = Math.floor(soins / 2);
    }
    bar1 += soins;
    let soinsEffectifs = soins;
    if (bar1 > pvmax) {
      if (attributeAsBool(perso, 'formeDArbre')) {
        let apv = tokenAttribute(perso, 'anciensPV');
        if (apv.length > 0) {
          apv = apv[0];
          let anciensPV = parseInt(apv.get('current'));
          let anciensMax = parseInt(apv.get('max'));
          if (!(isNaN(anciensPV) || isNaN(anciensMax)) &&
            anciensPV < anciensMax) {
            let soinsTransferes = bar1 - pvmax;
            if (anciensMax - anciensPV < soinsTransferes)
              soinsTransferes = anciensMax - anciensPV;
            anciensPV += soinsTransferes;
            bar1 -= soinsTransferes;
            setTokenAttr(perso, 'anciensPV', anciensPV, evt, {
              maxVal: anciensMax
            });
          }
        }
      }
      // On  cherche si il y a des DM temporaires à soigner
      if (bar1 > pvmax) {
        let hasMana = (ficheAttributeAsInt(perso, 'PM', 0) > 0);
        let dmgTemp;
        const estMook = token.get('bar1_link') === '';
        if (hasMana) {
          if (estMook) dmgTemp = attributeAsInt(perso, 'DMTEMP', 0);
          else dmgTemp = ficheAttributeAsInt(perso, 'DMTEMP', 0);
        } else {
          dmgTemp = toInt(token.get('bar2_value'), 0);
        }
        if (dmgTemp > 0) {
          let newDmgTemp = dmgTemp - bar1 + pvmax;
          if (newDmgTemp < 0) {
            newDmgTemp = 0;
            bar1 -= dmgTemp;
          } else bar1 = pvmax;
          if (hasMana) setTokenAttr(perso, 'DMTEMP', newDmgTemp, evt);
          else updateCurrentBar(perso, 2, newDmgTemp, evt);
        }
        soinsEffectifs -= (bar1 - pvmax);
        bar1 = pvmax;
      }
    }
    if (bar1 == pvmax && attributeAsBool(perso, 'osBrises')) {
      removeTokenAttr(perso, 'osBrises', evt, {
        msg: "soigne ses os"
      });
    }
    if (updateBar1) updateCurrentBar(perso, 1, bar1, evt);
    if (soinsEffectifs > 0) {
      if (!options.recuperation) {
        if (attributeAsBool(perso, 'blessureQuiSaigne')) {
          removeTokenAttr(perso, 'blessureQuiSaigne', evt, {
            msg: ": les soins referment la blessure"
          });
          removeTokenAttr(perso, 'blessureQuiSaignePuissant', evt);
          removeTokenAttr(perso, 'blessureQuiSaigneValeur', evt);
          removeTokenAttr(perso, 'blessureQuiSaigneSaveParTour', evt);
          removeTokenAttr(perso, 'blessureQuiSaigneSaveParTourType', evt);
          removeTokenAttr(perso, 'blessureQuiSaigneTempeteDeManaIntense', evt);
          removeTokenAttr(perso, 'blessureQuiSaigneOptions', evt);
        }
        if (attributeAsBool(perso, 'reactionAllergique')) {
          removeTokenAttr(perso, 'reactionAllergique', evt, {
            msg: ": les soins mettent fin à la réaction allergique"
          });
        }
      }
      if (callTrue) callTrue(soinsEffectifs);
    } else {
      if (callMax) callMax();
    }
  }

  //!cof2-reveler-nom [nouveau nom]
  function commandeRevelerNom(msg, cmd, playerId, pageId, options) {
    let {
      selected
    } = getSelected(msg, pageId, options);
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

  function commandeUndo(msg, cmd, playerId, pageId, options) {
    undoEvent();
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

  //Modifie optArgs (liste de strings) et options (objet)
  function addWeaponStatsToOptions(perso, weaponStats, optArgs, options, indexAussiJet) {
    if (weaponStats.options) {
      let wo = weaponStats.options.trim();
      //Pour la partie options, il est possible qu'elle soit déjà passée en ligne de commande
      if (wo !== '' && ((optArgs.length < 1 || !optArgs[0].startsWith('attaqueOptions'))) || indexAussiJet > 0) {
        wo = ' ' + wo;
        wo.split(' --').reverse().forEach(function(o) {
          o = o.trim();
          if (o === '') return;
          optArgs.unshift(o);
        });
      }
    }
    if (weaponStats.modificateurs) {
      weaponStats.modificateurs.split(',').reverse().forEach(function(m) {
        m = m.trim();
        if (m === '') return;
        m.split(' ').reverse().forEach(function(m) {
          m = m.trim();
          if (m === '') return;
          optArgs.unshift(m);
        });
      });
    }
    options.sortilege = weaponStats.sortilege;
    options.hache = weaponStats.hache;
    options.armeNaturelle = weaponStats.armeNaturelle;
    options.poudre = weaponStats.poudre;
    options.arme = weaponStats.arme || weaponStats.armeGauche || weaponStats.armeDeJet;
    switch (weaponStats.typeDegats) {
      case 'mental':
        options.attaqueMentale = true;
        /* falls through */
      case 'feu':
      case 'froid':
      case 'acide':
      case 'electrique':
      case 'sonique':
      case 'poison':
      case 'maladie':
      case 'drain':
      case 'energie':
        options.type = weaponStats.typeDegats;
        break;
      case 'magique':
        options.magique = true;
        options.type = 'energie'; //Les dégâts magiques sans type associé sont supposés de type énergie, l'équivalent de force dans PF1
        break;
      case 'tranchant':
      case 'percant':
      case 'contondant':
        options[weaponStats.typeDegats] = true;
        break;
    }
  }

  function closeIte(scope) {
    let ps = scope.parentScope;
    if (ps === undefined) return;
    log("Il manque un endif");
    delete scope.parentScope;
    closeIte(ps);
  }

  function getFx(cmd, argName, obj, funName) {
    if (cmd.length < 2) {
      let errMsg = "Il manque un argument à l'option --" + argName;
      if (funName) errMsg += " de " + funName;
      sendChat("COF", errMsg);
      return;
    }
    if (cmd[1] == 'custom' && cmd.length > 2) {
      let effet = findObjs({
        _type: 'custfx',
        name: cmd[2]
      });
      if (effet.length === 0) {
        sendChat("COF", "L'effet custom " + cmd[2] + " est inconnu.");
        return;
      }
      obj[argName] = effet[0].id;
    } else obj[argName] = cmd[1];
  }

  function parseCondition(args) {
    if (args.length === 0) return;
    switch (args[0]) {
      case 'crit':
      case 'critique':
        return {
          type: 'critique'
        };
      case 'etat':
        if (args.length < 2) {
          error("condition non reconnue", args);
          return;
        }
        if (_.has(cof_states, args[1])) {
          return {
            type: 'etat',
            etat: args[1],
            text: args[1]
          };
        }
        return {
          type: 'attribut',
          attribute: args[1],
          text: args[1]
        };
      case 'attribut':
        {
          if (args.length < 3) {
            error("Il manque un argument pour comparer l'attribut", args);
            return;
          }
          let res = {
            type: 'attribut',
            attribute: args[1],
            valeur: args[2].toLowerCase(),
            text: args[1] + ' ' + args[2]
          };
          if (args.length > 3) {
            if (args[3] == 'local') {
              res.local = true;
            } else if (args[3] == 'fiche') {
              res.fiche = {};
              if (args.length > 4) {
                res.fiche.def = args[4];
              }
            }
          }
          return res;
        }
      case 'etatCible':
        if (args.length < 2) {
          error("condition non reconnue", args);
          return;
        }
        if (_.has(cof_states, args[1])) {
          return {
            type: 'etatCible',
            etat: args[1],
            text: args[1]
          };
        }
        return {
          type: 'attributCible',
          attribute: args[1],
          local: true,
          text: args[1]
        };
      case 'attributCible':
        {
          if (args.length < 3) {
            error("Il manque un argument pour comparer l'attribut de la cible", args);
            return;
          }
          let res = {
            type: 'attributCible',
            attribute: args[1],
            valeur: args[2].toLowerCase(),
            text: args[1] + ' ' + args[2]
          };
          if (args.length > 3) {
            if (args[3] == 'local') {
              res.local = true;
            } else if (args[3] == 'fiche') {
              res.fiche = {};
              if (args.length > 4) {
                res.fiche.def = args[4];
              }
            }
          }
          return res;
        }
      case 'predicatCible':
        if (args.length < 2) {
          error("Il manque le prédicat de la cible", args);
          return;
        }
        let valeur;
        if (args.length > 2) valeur = args[2];
        return {
          type: 'predicatCible',
          predicat: args[1],
          valeur: valeur,
          text: args[1] + ' ' + valeur
        };
      case 'typeCible':
        if (args.length < 2) {
          error("Il manque le type de la cible", args);
          return;
        }
        return {
          type: 'typeCible',
          race: args[1],
          text: args[1]
        };
      case 'premiereAttaque':
        return {
          type: 'premiereAttaque'
        };
      case 'moitieMoins':
        return {
          type: 'moins',
          attribute: args[1],
          text: args[1],
          moitie: true
        };
      case 'deAttaque':
        if (args.length < 2) {
          error("condition non reconnue", args);
          return;
        }
        let valeurDeAttaque = parseInt(args[1]);
        if (isNaN(valeurDeAttaque)) {
          error("La condition de dé d'attaque doit être un nombre", args);
          // on continue exprès pour tomber dans le cas par défaut
        } else {
          return {
            type: 'deAttaque',
            seuil: valeurDeAttaque,
            text: args[1]
          };
        }
        /* falls through */
      default:
        return {
          type: args[0],
          attribute: args[1],
          text: args[1]
        };
    }
  }

  // Pour les limites par jour, combat ou tour,
  // cmd[1] est la valeur ou un prédicat
  // cmd[2] est la ressource
  function parseLimite(cmd, type) {
    let l = parseInt(cmd[1]);
    if (isNaN(l)) {
      l = {
        predicat: cmd[1]
      };
    } else if (l < 1) {
      error("La limite " + type + " doit être un nombre positif", cmd);
      return;
    } else {
      l = {
        val: l
      };
    }
    if (cmd.length > 2) {
      cmd.splice(0, 2);
      l.ressource = cmd.join('_');
    }
    return l;
  }

  //juste le traitement d'une liste d'options
  // lastEtat : dernier de etats et effets, pour savoir à quoi appliquer --save
  // lastType : dernier type de dégâts infligés
  // scope : pour les conditionnelles
  // TODO: regarder les options encore utilisées, enlever et mettre dans parseOptions celles qui peuvent y aller.
  function parseAttackOptions(attaquant, optArgs, lastEtat, lastType, scope, playerId, msg, targetToken, attackLabel, weaponStats, options, commandArgs) {
    optArgs.forEach(function(arg) {
      arg = arg.trim();
      let cmd = arg.split(' ');
      cmd = cmd.filter(function(c) {
        return c !== '';
      });
      if (cmd.length === 0) cmd = [arg];
      switch (cmd[0]) {
        case 'ignoreMoitieRD':
        case 'malediction':
        case 'pressionMortelle':
        case 'pietine':
        case 'percute':
        case 'maxDmg':
        case 'ouvertureMortelle':
        case 'seulementVivant':
        case 'etreinteImmole':
        case 'etreinteScorpion':
        case 'seulementDistance':
        case 'seulementContact':
        case 'tempDmg':
        case 'eclairDEnergie':
          scope[cmd[0]] = true;
          return;
        case 'affute':
        case 'arc':
        case 'arbalete':
        case 'armeDArgent':
        case 'artificiel':
        case 'attaqueAssuree':
        case 'attaqueFlamboyante':
        case 'attaqueRisquee':
        case 'attaqueOptions':
        case 'beni':
        case 'choc':
        case 'dominationPsy':
        case 'peutAgripper':
        case 'spectral':
        case 'epieu':
        case 'hache':
        case 'marteau':
        case 'vicieux':
        case 'attaqueMentale':
        case 'auto':
        case 'demiAuto':
        case 'energiePositive':
        case 'explodeMax':
        case 'explosion':
        case 'feinte':
        case 'ignoreObstacles':
        case 'mainsDEnergie':
        case 'pasDeDmg':
        case 'pointsVitaux':
        case 'poudre':
        case 'metal':
        case 'adamantium':
        case 'ferFroid':
        case 'reroll1':
        case 'reroll2':
        case 'semonce':
        case 'sortilege':
        case 'strigeSuce':
        case 'tirDeBarrage':
        case 'test':
        case 'traquenard':
        case 'tueurDeGeants': //obsolète
        case 'tueurDeGrands':
        case 'grenaille':
        case 'attaqueArmeeConjuree':
        case 'difficultePVmax':
        case 'difficultePV':
        case 'lamesJumelles':
        case 'riposte':
        case 'secret':
        case 'saufAllies':
        case 'tirAveugle':
        case 'attaqueBouclierRenverse':
        case 'necromancie':
        case 'runeDePuissance':
          options[cmd[0]] = true;
          return;
        case 'aussiArmeDeJet':
          if (cmd.length < 2) {
            error("Il faut préciser l'arme associée à celle-ci pour --aussiArmeDeJet", cmd);
            return;
          }
          options.aussiArmeDeJet = cmd[1];
          return;
        case 'tranchant':
        case 'contondant':
        case 'percant':
          options.contondant = undefined;
          options.percant = undefined;
          options.tranchant = undefined;
          options[cmd[0]] = true;
          return;
        case 'nom':
        case 'special':
          if (cmd.length < 1) {
            error("Il manque le nom après l'option --" + cmd[0], cmd);
            return;
          }
          options[cmd[0]] = cmd.slice(1).join(' ').trim();
          return;
        case 'toucher':
        case 'modifiePortee':
          if (cmd.length < 1) {
            error("Il manque la valeur après l'option --" + cmd[0], cmd);
            return;
          }
          let intArg = parseInt(cmd[1]);
          if (isNaN(intArg)) {
            error("valeur de " + cmd[0] + " incorrecte", cmd);
            return;
          }
          options[cmd[0]] = intArg;
          return;
        case 'crit':
          if (cmd.length < 1) {
            error("Il manque la valeur après l'option --crit", cmd);
            return;
          }
          let crit = parseInt(cmd[1]);
          if (isNaN(crit)) {
            error("valeur de critique incorrecte", cmd);
            return;
          }
          if (crit < 2) crit = 2;
          else if (crit > 20) crit = 20;
          options.crit = crit;
          return;
        case 'dm':
          if (cmd.length < 1) {
            error("Il manque la valeur après l'option --dm", cmd);
            return;
          }
          let dm = parseDice(cmd.slice(1).join(''), 'dégâts');
          if (dm) options.dm = dm;
          return;
        case 'portee':
          if (cmd.length < 1) {
            error("Il manque la valeur après l'option --portee", cmd);
            return;
          }
          let portee = parseInt(cmd[1]);
          if (isNaN(portee) || portee < 0) {
            error("valeur de critique incorrecte", cmd);
            return;
          }
          options.portee = portee;
          return;
        case 'frappeDesArcanes':
          options.frappeDesArcanes = 2;
          if (cmd.length > 1) {
            options.frappeDesArcanes = parseInt(cmd[1]);
            if (isNaN(options.frappeDesArcanes) || options.frappeDesArcanes < 1)
              options.frappeDesArcanes = 2;
          }
          return;
        case 'attaqueMagiqueDe':
          if (cmd.length < 1) {
            error("Il manque le nom du personnage après l'option --attaqueMagiqueDe", cmd);
            return;
          }
          let attaqueMagiqueDe = cmd.slice(1).join(' ');
          let ficheAttaqueMagique = findObjs({
            type: 'character',
            name: attaqueMagiqueDe
          });
          if (ficheAttaqueMagique.length === 0) {
            error("Il n'existe pas de personnage nommé " + attaqueMagiqueDe, cmd);
            return;
          }
          if (ficheAttaqueMagique.length > 1) {
            error("Attention, il existe plus d'un pesonnage nommé " + attaqueMagiqueDe, cmd);
          }
          let amCid = {
            charId: ficheAttaqueMagique[0].id
          };
          let toucher = computeArmeAtk(amCid, '@{ATKMAG}');
          if (isNaN(toucher)) {
            error("Impossible de déterminer l'attaque de " + attaqueMagiqueDe, toucher);
            return;
          }
          if (options.toucher !== undefined) {
            error("Attention, on a à la fois une option toucher et une option attaqueMagiqueDe. On ignore l'option --toucher", optArgs);
          }
          options.toucher = toucher;
          return;
        case 'imparable': //deprecated
          options.m2d20 = true;
          return;
        case 'tirDouble':
          {
            let label = attackLabel;
            if (cmd.length > 1) {
              label = cmd[1];
            }
            options.tirDouble = {
              label,
              attaquant,
              targetToken,
              msg,
              playerId,
              commandArgs
            };
            return;
          }
        case 'secondTir':
          options.secondTir = true;
          return;
        case 'ignoreRD':
          if (cmd.length < 2) {
            scope.ignoreTouteRD = true;
            return;
          }
          scope.ignoreRD = parseInt(cmd[1]);
          if (isNaN(scope.ignoreRD) || scope.ignoreRD < 1) {
            log("Pas un nombre positif après --ignoreRD, interprété comme ignore toute la RD");
            scope.ignoreRD = undefined;
            scope.ignoreTouteRD = true;
          }
          return;
        case 'tueurDe':
          if (cmd.length < 2) {
            error("Il faut préciser --tueurDe quoi", cmd);
            return;
          }
          options.tueurDe = options.tueurDe || [];
          options.tueurDe.push(cmd[1]);
          return;
        case 'magique':
          let niveauMagie = 1;
          if (cmd.length > 1) {
            niveauMagie = parseInt(cmd[1]);
            if (isNaN(niveauMagie) || niveauMagie < 1) {
              error("Le niveau de magie doit être au moins 1", cmd);
              niveauMagie = 1;
            }
          }
          options.magique = niveauMagie;
          return;
        case 'si':
          options.conditionAttaquant = parseCondition(cmd.slice(1));
          return;
        case 'tempsRecharge':
          if (cmd.length < 3) {
            error("Il manque un argument à l'option --tempsRecharge de !cof-attack", cmd);
            return;
          }
          if (!estEffetTemp(cmd[1])) {
            error("Le premier argument de l'option --tempsRecharge doit être un effet temporaire répertorié", cmd);
            return;
          }
          let tr = parseInt(cmd[2]);
          if (isNaN(tr)) {
            error("Le deuxième argument de l'option --tempsRecharge doit être un nombre", cmd);
            return;
          }
          options.tempsRecharge = {
            effet: cmd[1],
            duree: tr
          };
          return;
        case 'plus':
          if (cmd.length < 2) {
            error("Il manque un argument à l'option --plus de !cof-attack", cmd);
            return;
          }
          let val = arg.substring(arg.indexOf(' ') + 1);
          scope.additionalDmg = scope.additionalDmg || [];
          scope.additionalDmg.push({
            value: val,
            type: scope.type,
          });
          break;
        case 'plusCrit':
          if (cmd.length < 2) {
            error("Il manque un argument à l'option --plusCrit de !cof-attack", cmd);
            return;
          }
          let valCrit = arg.substring(arg.indexOf(' ') + 1);
          scope.additionalCritDmg = scope.additionalCritDmg || [];
          scope.additionalCritDmg.push({
            value: valCrit,
            type: scope.type
          });
          break;
        case 'dmSiRate':
        case 'dmCible':
          if (cmd.length < 2) {
            error("Il manque un argument à l'option --" + cmd[0] + " de !cof-attack", cmd);
            return;
          }
          let valDm = arg.substring(arg.indexOf(' ') + 1);
          options[cmd[0]] = {
            value: valDm,
            type: scope.type
          };
          break;
        case 'effet':
          {
            if (cmd.length < 2) {
              error("Il manque un argument à l'option --effet de !cof-attack", cmd);
              return;
            }
            let effet = cmd[1];
            if (cof_states[effet] && cmd.length > 2) { //remplacer par sa version effet temporaire
              effet += 'Temp';
            }
            if (estEffetTemp(effet)) {
              let duree = 1;
              if (cmd.length > 2) {
                if (cmd[2] == 'fin') duree = 0;
                else {
                  duree = parseInt(cmd[2]);
                  if (isNaN(duree) || duree < 1) {
                    error(
                      "Le deuxième argument de --effet doit être un nombre positif",
                      cmd);
                    return;
                  }
                }
              }
              let m = messageOfEffetTemp(effet);
              lastEtat = {
                effet,
                duree,
                message: m,
                typeDmg: lastType
              };
              scope.seulementVivant = scope.seulementVivant || (m && m.seulementVivant);
            } else if (estEffetCombat(effet)) {
              lastEtat = {
                effet,
                typeDmg: lastType,
                message: messageEffetCombat[effet]
              };
            } else if (estEffetIndetermine(effet)) {
              lastEtat = {
                effet,
                effetIndetermine: true,
                typeDmg: lastType,
                message: messageEffetIndetermine[effet]
              };
            } else {
              error(cmd[1] + " n'est pas un effet temporaire répertorié", cmd);
              return;
            }
            scope.effets = scope.effets || [];
            scope.effets.push(lastEtat);
            return;
          }
        case 'finEffet':
          {
            if (cmd.length < 2) {
              error("Il manque un argument à l'option --finEffet de !cof-attack", cmd);
              return;
            }
            let effet = cmd[1];
            if (cof_states[effet]) { //remplacer par sa version effet temporaire
              effet += 'Temp';
            }
            if (estEffetTemp(effet)) {
              let m = messageOfEffetTemp(effet);
              lastEtat = {
                effet,
                duree: 0,
                finEffet: true,
                message: m,
                typeDmg: lastType
              };
              scope.seulementVivant = scope.seulementVivant || (m && m.seulementVivant);
            } else if (estEffetCombat(effet)) {
              lastEtat = {
                effet,
                finEffet: true,
                typeDmg: lastType,
                message: messageEffetCombat[effet]
              };
            } else if (estEffetIndetermine(effet)) {
              lastEtat = {
                effet,
                finEffet: true,
                effetIndetermine: true,
                typeDmg: lastType,
                message: messageEffetIndetermine[effet]
              };
            } else {
              error(cmd[1] + " n'est pas un effet temporaire répertorié", cmd);
              return;
            }
            scope.effets = scope.effets || [];
            scope.effets.push(lastEtat);
            return;
          }
        case 'valeur':
          if (cmd.length < 2) {
            error("Il manque un argument à l'option --valeur de !cof-attack", cmd);
            return;
          }
          if (scope.effets === undefined || scope.effets.length === 0) {
            error("Il faut un effet avant l'option --valeur", optArgs);
            return;
          }
          scope.effets[0].valeur = cmd[1];
          if (cmd.length > 2) {
            scope.effets[0].valeurMax = cmd[2];
            if (scope.effets[0].effet && scope.effets[0].effet.startsWith('dotGen(')) {
              scope.effets[0].typeDmg = cmd[2];
            }
          }
          return;
        case 'accumuleDuree':
          if (cmd.length < 2) {
            error("Il manque la valeur en argument de l'option --accumuleDuree", cmd);
            return;
          }
          let accumuleDuree = parseInt(cmd[1]);
          if (isNaN(accumuleDuree) || accumuleDuree < 1) {
            error("On ne peut accumuler qu'on nombre strictement positif d'effets", cmd);
            return;
          }
          if (scope.effets === undefined || scope.effets.length === 0) {
            error("Il faut un effet avant l'option --accumuleValeur", optArgs);
            return;
          }
          scope.effets[0].accumuleDuree = accumuleDuree;
          return;
        case 'optionEffet':
          if (cmd.length < 2) {
            error("Il manque l'option en argument de --optionEffet", cmd);
            return;
          }
          if (scope.effets === undefined || scope.effets.length === 0) {
            error("Il faut un effet avant l'option --optionEffet", optArgs);
            return;
          }
          scope.effets[0].options = scope.effets[0].options || '';
          scope.effets[0].options = ' --' + cmd.slice(1).join(' ') + scope.effets[0].options;
          return;
        case 'etatSi':
        case 'etat':
          {
            if (cmd.length < 3 && cmd[0] == 'etatSi') {
              error("Il manque un argument à l'option --etatSi de !cof-attack", cmd);
              return;
            } else if (cmd.length < 2) {
              error("Il manque un argument à l'option --etat de !cof-attack", cmd);
              return;
            }
            let etat = cmd[1];
            if (!_.has(cof_states, etat)) {
              error("État " + etat + " non reconnu", cmd);
              return;
            }
            let condition = 'toujoursVrai';
            if (cmd[0] == 'etatSi') {
              condition = parseCondition(cmd.slice(2));
              if (condition === undefined) return;
            }
            scope.etats = scope.etats || [];
            lastEtat = {
              etat,
              condition,
              typeDmg: lastType
            };
            if (cmd[0] == 'etat' && cmd.length > 3) {
              if (!isCarac(cmd[2]) && (cmd[2].length != 6 ||
                  !isCarac(cmd[2].substring(0, 3)) || !isCarac(cmd[2].substring(3, 6)))) {
                error("Caractéristique du jet de sauvegarde incorrecte", cmd);
                return;
              }
              lastEtat.saveCarac = cmd[2];
              let opposition = persoOfId(cmd[3]);
              if (opposition) {
                lastEtat.saveDifficulte = cmd[3] + ' ' + nomPerso(opposition);
              } else {
                lastEtat.saveDifficulte = parseInt(cmd[3]);
                if (isNaN(lastEtat.saveDifficulte)) {
                  error("Difficulté du jet de sauvegarde incorrecte", cmd);
                  delete lastEtat.saveCarac;
                  delete lastEtat.saveDifficulte;
                }
              }
            }
            scope.etats.push(lastEtat);
            return;
          }
        case 'finEtat':
          {
            if (cmd.length < 2) {
              error("Il manque un argument à l'option --finEtat de !cof-attack", cmd);
              return;
            }
            let etat = cmd[1];
            if (!_.has(cof_states, etat)) {
              error("État " + etat + " non reconnu", cmd);
              return;
            }
            let effet = etat + 'Temp';
            scope.effets = scope.effets || [];
            lastEtat = {
              effet,
              duree: 0,
              typeDmg: lastType
            };
            scope.effets.push(lastEtat);
            return;
          }
        case 'peur':
          if (cmd.length < 3) {
            error("Il manque un argument à l'option --peur de !cof-attack", cmd);
            return;
          }
          scope.peur = {
            seuil: parseInt(cmd[1]),
            duree: parseInt(cmd[2])
          };
          if (isNaN(scope.peur.seuil)) {
            error("Le premier argument de --peur doit être un nombre (le seuil)", cmd);
          }
          if (isNaN(scope.peur.duree) || scope.peur.duree <= 0) {
            error("Le deuxième argument de --peur doit être un nombre positif (la durée)", cmd);
          }
          return;
        case 'feu':
        case 'froid':
        case 'acide':
        case 'electrique':
        case 'sonique':
        case 'poison':
        case 'maladie':
        case 'argent':
        case 'drain':
        case 'energie':
          lastType = cmd[0];
          let l = 0;
          if (scope.additionalDmg) l = scope.additionalDmg.length;
          if (l > 0) {
            scope.additionalDmg[l - 1].type = cmd[0];
          } else {
            scope.type = cmd[0];
          }
          return;
        case 'nature':
        case 'naturel':
          scope.nature = true;
          return;
        case 'vampirise':
          let vampirise = 100;
          if (cmd.length > 1) {
            vampirise = parseInt(cmd[1]);
            if (isNaN(vampirise)) {
              error("Il faut un pourcentage entier comme argument à --vampirise", cmd);
              vampirise = 100;
            }
          }
          scope.vampirise = vampirise;
          return;
        case 'sournoise':
          if (scope.sournoise === undefined) scope.sournoise = 0;
          if (cmd.length < 2) {
            scope.sournoise += predicateAsInt(attaquant, 'attaqueSournoise', 1);
            return;
          }
          scope.sournoise += parseInt(cmd[1]);
          if (isNaN(scope.sournoise) || scope.sournoise < 0) {
            error("L'option --sournoise de !cof-attack attend un argument entier positif", cmd);
            return;
          }
          break;
        case 'attaqueAcrobatique':
          if (cmd.length < 2) {
            options.attaqueAcrobatique = predicateAsInt(attaquant, 'attaqueSournoise', 1);
            return;
          }
          options.attaqueAcrobatique = parseInt(cmd[1]);
          if (isNaN(options.attaqueAcrobatique) || options.attaqueAcrobatique < 0) {
            error("L'option --attaqueAcrobatique de !cof-attack attend un argument entier positif", cmd);
            return;
          }
          break;
        case 'disparition':
          if (cmd.length < 2) {
            error("Il manque un argument à l'option --disparition de !cof-attack", cmd);
            return;
          }
          let disparition = parseInt(cmd[1]);
          if (isNaN(disparition) || disparition < 0) {
            error("L'option --disparition de !cof-attack attend un argument entier positif", cmd);
            return;
          }
          if (options.disparition === undefined) options.disparition = 0;
          options.disparition += disparition;
          return;
        case 'fx':
          getFx(cmd, 'fx', scope, '!cof-attack');
          return;
        case 'targetFx':
          getFx(cmd, 'targetFx', scope, '!cof-attack');
          return;
        case 'psave':
          let psaveopt = scope;
          let psaveParams = parseSave(cmd);
          if (psaveParams) {
            if (psaveParams.local) {
              let psavel = 0;
              if (scope.additionalDmg) psavel = scope.additionalDmg.length;
              if (psavel > 0) {
                psaveopt = scope.additionalDmg[psavel - 1];
              }
            }
            psaveopt.partialSave = psaveParams;
            psaveopt.attaquant = {...attaquant
            };
          }
          return;
        case 'saveDM':
          let saveDMopt = scope;
          let saveDMParams = parseSave(cmd);
          if (saveDMParams) {
            if (saveDMParams.local) {
              let psavel = 0;
              if (scope.additionalDmg) psavel = scope.additionalDmg.length;
              if (psavel > 0) {
                saveDMopt = scope.additionalDmg[psavel - 1];
              }
            }
            saveDMopt.totalSave = saveDMParams;
            saveDMopt.attaquant = {...attaquant
            };
          }
          return;
        case 'save':
          if (lastEtat) {
            if (lastEtat.save) {
              error("Redéfinition de la condition de save pour un effet", optArgs);
            }
            let saveParams = parseSave(cmd);
            if (saveParams) {
              lastEtat.save = saveParams;
              lastEtat.save.entrave =
                lastEtat.etat == 'paralyse' || lastEtat.etat == 'immobilise' || lastEtat.etat == 'ralenti' || (lastEtat.message && lastEtat.message.entrave);
              return;
            }
            return;
          }
          error("Pas d'effet auquel appliquer le save", optArgs);
          return;
        case 'saveParTour':
        case 'saveActifParTour':
        case 'saveParJour':
          if (lastEtat) {
            if (lastEtat[cmd[0]]) {
              error("Redéfinition de la condition de save pour un effet", optArgs);
            }
            let saveParTourParams = parseSave(cmd);
            if (saveParTourParams) {
              lastEtat[cmd[0]] = saveParTourParams;
              return;
            }
            return;
          }
          error("Pas d'effet auquel appliquer le save", optArgs);
          return;
        case 'retourneEnMain':
          scope.retourneEnMain = {};
          if (cmd.length > 2) {
            let conditionRetour = parseSave(cmd);
            if (conditionRetour) scope.retourneEnMain = conditionRetour;
          }
          return;
        case 'mana':
          {
            if (cmd.length < 2) {
              error("Usage : --mana coût", cmd);
              return;
            }
            let mana = parseInt(cmd[1]);
            if (isNaN(mana) || mana < 0) {
              error("Le coût en mana doit être un nombre positif");
              return;
            }
            if (scope.mana === undefined) scope.mana = 0;
            scope.mana += mana;
            return;
          }
        case 'magieRapide':
          if (options.magieRapide) return;
          if (options.mana === undefined) options.mana = 0;
          let cout = 1;
          if (cmd.length > 1) {
            cout = parseInt(cmd[1]);
            if (isNaN(cout) || cout < 0) {
              error("Le coût de la magie rapide n'est pas un entier positif", cmd);
              cout = 1;
            }
          }
          if (reglesOptionelles.mana.val.mana_totale.val) cout = 3;
          options.mana += cout;
          options.magieRapide = true;
          return;
        case 'magieEnArmure':
          if (cmd.length > 1) {
            if (cmd[1] == 'mana') {
              options.magieEnArmureMana = true;
            } else {
              let base = parseInt(cmd[1]);
              if (isNaN(base)) {
                error("L'argument de --magieEnArmure doit être un nombre ou mana", cmd);
                return;
              }
              options.magieEnArmure = {
                base
              };
            }
          } else {
            options.magieEnArmure = {};
          }
          return;
        case 'rang':
          if (cmd.length < 2) {
            error("Usage : --rang r", cmd);
            return;
          }
          let rang = parseInt(cmd[1]);
          if (isNaN(rang) || rang < 1) {
            error("Le rang doit être un nombre positif");
            return;
          }
          scope.rang = rang;
          break;
        case 'bonusAttaque':
        case 'bonusContreBouclier':
        case 'bonusContreArmure':
          if (cmd.length < 2) {
            error("Usage : --" + cmd[0] + " b", cmd);
            return;
          }
          let bAtt = parseInt(cmd[1]);
          if (isNaN(bAtt)) {
            error("Le bonus (" + cmd[0] + ") doit être un nombre");
            return;
          }
          if (scope[cmd[0]] === undefined) scope[cmd[0]] = 0;
          scope[cmd[0]] += bAtt;
          return;
        case 'bonusCritique':
        case 'attaqueDeGroupe':
          if (cmd.length < 2) {
            error("Usage : --" + cmd[0] + " b", cmd);
            return;
          }
          let b2Att = parseInt(cmd[1]);
          if (isNaN(b2Att)) {
            error("Le bonus (" + cmd[0] + ") doit être un nombre");
            return;
          }
          if (options[cmd[0]] === undefined) options[cmd[0]] = 0;
          options[cmd[0]] += b2Att;
          return;
        case 'puissant':
          if (cmd.length < 2) {
            scope.puissant = true;
            return;
          }
          switch (cmd[1]) {
            case 'oui':
            case 'Oui':
              scope.puissant = true;
              return;
            case 'non':
            case 'Non':
              scope.puissant = false;
              return;
            case 'duree':
              scope.puissantDuree = true;
              return;
            case 'portee':
              scope.puissantPortee = true;
              return;
            default:
              scope.puissant = attributeAsBool(attaquant, cmd[1] + "Puissant");
          }
          return;
        case 'rate':
        case 'touche':
        case 'critique':
        case 'echecCritique':
        case 'pasDEchecCritique':
          if (playerId && !playerIsGM(playerId)) {
            sendChat('COF', "Pas le droit d'utiliser l'option --" + cmd[0]);
            return;
          }
          if (scope.triche === undefined) {
            scope.triche = cmd[0];
          } else {
            error("Option incompatible", optArgs);
          }
          return;
        case 'munition':
          error("option --munition pas encore implémentée", optArgs); //TODO
          return;
        case "ligne":
          if (options.aoe) {
            error("Deux options pour définir une aoe", optArgs);
            return;
          }
          options.aoe = {
            type: 'ligne'
          };
          return;
        case 'disque':
          if (options.aoe) {
            error("Deux options pour définir une aoe", optArgs);
            return;
          }
          if (cmd.length < 2) {
            error("Il manque le rayon du disque", cmd);
            return;
          }
          options.aoe = {
            type: 'disque',
            rayon: parseInt(cmd[1])
          };
          if (isNaN(options.aoe.rayon) || options.aoe.disque < 0) {
            error("le rayon du disque n'est pas un nombre positif", cmd);
            delete options.aoe;
          }
          if (cmd.length > 2 && cmd[2] == 'souffleDeMort') {
            options.aoe.souffleDeMort = {};
          }
          return;
        case 'cone':
          if (options.aoe) {
            error("Deux options pour définir une aoe", optArgs);
            return;
          }
          let angle = 90;
          if (cmd.length > 1) {
            angle = parseInt(cmd[1]);
            if (isNaN(angle) || angle < 0 || angle > 360) {
              error("Paramètre d'angle du cone incorrect", cmd);
              angle = 90;
            }
          }
          options.aoe = {
            type: 'cone',
            angle: angle
          };
          return;
        case 'target':
          if (cmd.length < 2) {
            error("Il manque l'id de la cible", cmd);
            return;
          }
          let targetS = persoOfId(cmd[1]);
          if (targetS === undefined) {
            error("Cible supplémentaire invalide", cmd);
            return;
          }
          if (targetToken.id == targetS.token.id) return;
          options.ciblesSupplementaires = options.ciblesSupplementaires || [];
          options.ciblesSupplementaires.push(targetS);
          return;
        case 'ricochets':
          {
            if (cmd.length < 2) {
              error("Il manque le nombre de ricochets", cmd);
              return;
            }
            let restants = parseInt(cmd[1]);
            if (isNaN(restants) || restants < 0) return;
            options.ricochets = {
              restants
            };
            cmd.shift();
            cmd.shift();
            options.ricochets.cibles = [];
            let last;
            cmd.forEach(function(cid) {
              let cible = persoOfId(cid);
              if (cible) {
                last = cible;
                options.ricochets.cibles.push(cible);
              }
            });
            if (last) options.origineDeLAttaque = last;
            return;
          }
        case 'ciblesDansDisque':
          if (cmd.length < 2) {
            error("Il manque le rayon du disque dans lequel les cibles doivent tnir", cmd);
            return;
          }
          options.ciblesDansDisque = parseInt(cmd[1]);
          if (isNaN(options.ciblesDansDisque) || options.ciblesDansDisque < 1) {
            error("le rayon du disque n'est pas un nombre positif", cmd);
            delete options.ciblesDansDisque;
          }
          return;
        case 'limiteParJour':
          {
            if (cmd.length < 2) {
              error("Il manque la limite journalière", cmd);
              return;
            }
            let limiteParJour = parseLimite(cmd, "journalière");
            if (limiteParJour) scope.limiteParJour = limiteParJour;
            return;
          }
        case 'limiteParCombat':
          {
            if (cmd.length < 2) {
              scope.limiteParCombat = {
                val: 1
              };
              return;
            }
            let limiteParCombat = parseLimite(cmd, "par combat");
            if (limiteParCombat) scope.limiteParCombat = limiteParCombat;
            return;
          }
        case 'limiteParTour':
          {
            if (cmd.length < 2) {
              scope.limiteParTour = {
                val: 1
              };
              return;
            }
            let limiteParTour = parseLimite(cmd, "par tour");
            if (limiteParTour) scope.limiteParTour = limiteParTour;
            return;
          }
        case 'decrAttribute':
          {
            if (cmd.length < 2) {
              error("Erreur interne d'une commande générée par bouton", cmd);
              return;
            }
            let attr = getObj('attribute', cmd[1]);
            if (attr === undefined) {
              attr = tokenAttribute(attaquant, cmd[1]);
              if (attr.length === 0) {
                error("Attribut à changer perdu", cmd);
                return;
              }
              attr = attr[0];
            }
            let da = {
              id: attr.id,
              val: 1
            };
            if (cmd.length > 2) da.val = toInt(cmd[2], 1);
            scope.decrAttribute = da;
            return;
          }
        case 'decrLimitePredicatParTour':
          if (cmd.length < 2) {
            error("Erreur interne d'une commande générée par bouton", cmd);
            return;
          }
          scope.decrLimitePredicatParTour = cmd[1];
          return;
        case 'forceMinimum':
          if (cmd.length < 2) {
            error("Il faut indiquer le minimum de force", cmd);
            return;
          }
          let forceMin = parseInt(cmd[1]);
          if (isNaN(forceMin)) {
            error("La force minimum doit être un nombre", cmd);
            return;
          }
          scope.forceMinimum = forceMin;
          return;
        case 'arcComposite':
          if (cmd.length < 2) {
            error("Il faut indiquer le bonus de l'arc composite", cmd);
            return;
          }
          let arcComposite = parseInt(cmd[1]);
          if (isNaN(arcComposite)) {
            error("Le bonus d'arc composite doit être un nombre", cmd);
            return;
          }
          scope.arcComposite = arcComposite;
          return;
        case 'incrDmgCoef':
          scope.dmgCoef = (scope.dmgCoef || 1);
          if (cmd.length > 1) {
            let incrDmgCoef = parseInt(cmd[1]);
            if (isNaN(incrDmgCoef)) {
              error("L'option --incrDmgCoef attend un entier", cmd);
              return;
            }
            scope.dmgCoef += incrDmgCoef;
            return;
          }
          scope.dmgCoef++; //Par défaut, incrémente de 1
          return;
        case 'toucheDoubleDmg':
          options.toucheDoubleDmg = true;
          options.dmgCoef = options.dmgCoef || 1;
          options.dmgCoef++;
          return;
        case 'diviseDmg':
          scope.diviseDmg = (scope.diviseDmg || 1);
          if (cmd.length > 1) {
            let divise = parseInt(cmd[1]);
            if (isNaN(divise)) {
              error("L'option --diviseDmg attend un entier", cmd);
              return;
            }
            scope.diviseDmg *= divise;
            return;
          }
          scope.diviseDmg *= 2; //Par défaut, divise par 2
          return;
        case 'divisePortee':
          scope.divisePortee = (scope.divisePortee || 1);
          if (cmd.length > 1) {
            let divise = parseInt(cmd[1]);
            if (isNaN(divise)) {
              error("L'option --divisePortee attend un entier", cmd);
              return;
            }
            scope.divisePortee *= divise;
            return;
          }
          scope.divisePortee *= 2; //Par défaut, divise par 2
          return;
        case 'incrCritCoef':
          scope.critCoef = (scope.critCoef || 1);
          if (cmd.length > 1) {
            let incrCritCoef = parseInt(cmd[1]);
            if (isNaN(incrCritCoef)) {
              error("L'option --incrCritCoef attend un entier", cmd);
              return;
            }
            scope.critCoef += incrCritCoef;
            return;
          }
          scope.critCoef++; //Par défaut, incrémente de 1
          return;
        case 'if':
          let ifCond = parseCondition(cmd.slice(1));
          if (ifCond === undefined) return;
          let ifThen = {
            parentScope: scope
          };
          scope.ite = scope.ite || [];
          scope.ite.push({
            condition: ifCond,
            then: ifThen
          });
          scope = ifThen;
          return;
        case 'ifSaveFails':
          let save = parseSave(cmd);
          if (save === undefined) return;
          let ifSaveThen = {
            parentScope: scope
          };
          scope.ite = scope.ite || [];
          let ifSaveCond = {
            type: 'save',
            saveCond: save,
            typeDmg: lastType
          };
          scope.ite.push({
            condition: ifSaveCond,
            then: ifSaveThen
          });
          scope = ifSaveThen;
          return;
        case "endif":
          let psEndif = scope.parentScope;
          if (psEndif === undefined) {
            error("--endIf sans --if correspondant", cmd);
            return;
          }
          delete scope.parentScope; //To remove circular dependencies in options
          scope = psEndif;
          return;
        case "else":
          {
            let psElse = scope.parentScope;
            if (psElse === undefined) {
              error("--else sans --if correspondant", cmd);
              return;
            }
            let iteL = psElse.ite[psElse.ite.length - 1];
            if (iteL.else) {
              error("Il y a déjà un --else pour ce --if", cmd);
              return;
            }
            delete scope.parentScope;
            let ifElse = {
              parentScope: psElse
            };
            iteL.else = ifElse;
            scope = ifElse;
            return;
          }
        case 'message':
          if (cmd.length < 2) {
            error("Il manque le message après --message", cmd);
            return;
          }
          scope.messages = scope.messages || [];
          scope.messages.push(cmd.slice(1).join(' '));
          return;
        case 'allonge':
          if (cmd.length < 2) {
            error("Il manque le message après --allonge", cmd);
            return;
          }
          if (options.allonge !== undefined) {
            error("Redéfinition de l'allonge", cmd);
          }
          options.allonge = parseFloat(cmd[1]);
          if (isNaN(options.allonge)) {
            error("L'argument de --allonge n'est pas un nombre", cmd);
          }
          return;
        case 'enveloppe':
          scope.enveloppe = {
            difficulte: 15,
            type: 'label',
            expression: attackLabel
          };
          if (cmd.length > 1) {
            scope.enveloppe.difficulte = parseInt(cmd[1]);
            if (isNaN(scope.enveloppe.difficulte))
              scope.enveloppe.difficulte = 15;
          }
          if (cmd.length > 3) {
            scope.enveloppe.type = cmd[2];
            scope.enveloppe.expression = cmd[3];
          }
          if (scope.enveloppe.expression === undefined) {
            error("Il n'est pas encore possible d'utiliser l'option --enveloppe sans expression si le label de l'attaque n'est pas défini", cmd);
            scope.enveloppe = undefined;
          }
          return;
        case 'etreinte':
          scope.enveloppe = {
            difficulte: 15,
            type: 'etreinte',
            expression: '1d6',
          };
          if (cmd.length > 1) {
            scope.enveloppe.difficulte = parseInt(cmd[1]);
            if (isNaN(scope.enveloppe.difficulte))
              scope.enveloppe.difficulte = 15;
          }
          if (cmd.length > 2) {
            scope.enveloppe.expression = cmd[2];
          }
          return;
        case 'imgAttack':
        case 'imgAttackEchec':
        case 'imgAttackEchecCritique':
        case 'imgAttackEchecClignotement':
        case 'imgAttackSucces':
        case 'imgAttackSuccesChampion':
        case 'imgAttackSuccesCritique':
          if (cmd.length < 1) {
            error("Il manque une image après --" + cmd[0], cmd);
            return;
          }
          options[cmd[0]] = cmd[1];
          return;
        case 'soundAttack':
        case 'soundAttackEchec':
        case 'soundAttackEchecCritique':
        case 'soundAttackEchecClignotement':
        case 'soundAttackSucces':
        case 'soundAttackSuccesChampion':
        case 'soundAttackSuccesCritique':
          if (cmd.length < 1) {
            error("Il manque le son après --" + cmd[0], cmd);
            return;
          }
          options[cmd[0]] = cmd.slice(1).join(' ');
          return;
          //Anciennes variantes, gardées pour la compatibilité
        case 'img-attack-echec-critique':
        case 'img-attack-echec':
        case 'img-attack-echec-clignotement':
        case 'img-attack-normal-touch':
        case 'img-attack-succes':
        case 'img-attack-champion-succes':
        case 'img-attack-succes-champion':
        case 'img-attack-succes-critique':
          if (cmd.length < 1) {
            error("Il manque une image après --" + cmd[0], cmd);
            return;
          }
          let imgCmd =
            cmd[0].replace('-a', 'A').replace('-e', 'E').replace('-c', 'C').replace('-n', 'N').replace('-s', 'S').replace('-t', 'T');
          if (imgCmd == 'imgAttackNormalTouch') imgCmd = 'imgAttackSucces';
          if (imgCmd == 'imgAttackChampionSucces') imgCmd = 'imgAttackSuccesChampion';
          options[imgCmd] = cmd[1];
          return;
        case 'sound-attack-echec-critique':
        case 'sound-attack-echec':
        case 'sound-attack-echec-clignotement':
        case 'sound-attack-normal-touch':
        case 'sound-attack-succes':
        case 'sound-attack-champion-succes':
        case 'sound-attack-succes-champion':
        case 'sound-attack-succes-critique':
          if (cmd.length < 2) {
            error("Il manque le son après --" + cmd[0], cmd);
            return;
          }
          let soundCmd = cmd[0].replace('-a', 'A').replace('-e', 'E').replace('-c', 'C').replace('-n', 'N').replace('-s', 'S').replace('-t', 'T');
          if (soundCmd == 'soundAttackNormalTouch') soundCmd = 'soundAttackSucces';
          if (soundCmd == 'soundAttackChampionSucces') soundCmd = 'soundAttackSuccesChampion';
          options[soundCmd] = cmd.slice(1).join(' ');
          return;
        case 'difficulteCarac':
          if (cmd.length < 2) {
            error("Il manque la caractéristique à laquelle mesurer le jet d'attaque", cmd);
            return;
          }
          options.difficulteCarac = parseCarac(cmd[1]);
          if (options.difficulteCarac === undefined) {
            error("L'argument de --difficulteCarac n'est pas une caractéristique", cmd);
          }
          return;
        case 'attackId':
          if (cmd.length < 2) {
            error("Il faut indiquer l'id", cmd);
            return;
          }
          options.attackId = cmd[1];
          return;
        case 'terrainDifficile':
          {
            let terrainDifficile = options.terrainDifficile || {
              duree: 1,
              imgsrc: IMG_INVISIBLE,
              nom: "Terrain difficile"
            };
            if (cmd.length > 1) { //le premier argument est la durée de l'effet
              terrainDifficile.duree = toInt(cmd[1], 1);
              if (cmd.length > 2) { //le second argument est le nom du terrain
                terrainDifficile.nom = cmd[2].replace(/_/g, ' ');
                if (cmd.length > 3) { //le troisième argument est l'url de l'image
                  let imgsrc = cmd[3].replace('&#58;', ':');
                  terrainDifficile.imgsrc = normalizeTokenImg(imgsrc);
                }
              }
            }
            options.terrainDifficile = terrainDifficile;
            return;
          }
        case 'deplaceDe':
          {
            if (cmd.length < 2) {
              error("Il faut préciser une distance maximale pour --deplaceDe", cmd);
              return;
            }
            let deplaceDe = {};
            deplaceDe.max = parseInt(cmd[1]);
            if (isNaN(deplaceDe.max) || deplaceDe.max < 0) {
              error("Distance de deplacement incorrect", cmd);
              return;
            }
            if (cmd.length > 2) {
              if (cmd[2] == 'saut') deplaceDe.saut = true;
              else {
                let dmax = parseInt(cmd[2]);
                if (isNaN(dmax) || dmax < deplaceDe.max) {
                  error("Argument de déplacement " + cmd[2] + " non reconnu", cmd);
                } else {
                  deplaceDe.min = deplaceDe.max;
                  deplaceDe.max = dmax;
                }
                if (cmd.length > 3 && cmd[3] == 'saut') deplaceDe.saut = true;
              }
            }
            options.deplaceDe = deplaceDe;
            return;
          }
        case 'draineMana':
          {
            if (cmd.length < 1) {
              error("Il manque la valeur après l'option --draineMana", cmd);
              return;
            }
            let dm = parseDice(cmd.slice(1).join(''), 'drain de mana');
            if (dm) options.draineMana = dm;
            return;
          }
        default:
          let armeMagique = cmd[0].match(/^\+([0-9]+)$/);
          if (armeMagique && armeMagique.length > 0) {
            let amp = parseInt(armeMagique[1]);
            //gestion du cumul des bonus
            if (options.armeMagiquePlus) {
              let bmp = amp;
              if (amp > options.armeMagiquePlus) {
                bmp = options.armeMagiquePlus;
                options.armeMagiquePlus = amp;
              }
              if (weaponStats.portee) weaponStats.portee += 10 * bmp;
            } else options.armeMagiquePlus = amp;
            if (options.magique === undefined) {
              options.magique = options.armeMagiquePlus;
            } else if (options.magique !== true) {
              options.magique += options.armeMagiquePlus;
            }
          } else {
            error("Argument de !cof-attack '" + arg + "' non reconnu", cmd);
          }
      }
    });
    closeIte(scope); //pour fermer les endif mal formés et éviter les boucles
    return {
      lastEtat,
      lastType,
      scope
    };
  }

  //parse les options de weaponStats et les ajoute à options
  //options doit être défini
  function parseWeaponStatsOptions(attaquant, defenseur, weaponStats, playerId, options) {
    if (!weaponStats) return;
    let tokenDef;
    if (defenseur) tokenDef = defenseur.token;
    let optArgs = [];
    let commandArgs = [...optArgs];
    addWeaponStatsToOptions(attaquant, weaponStats, optArgs, options);
    parseAttackOptions(attaquant, optArgs, undefined, options.type, options, playerId, {}, tokenDef, weaponStats.label, weaponStats, options, commandArgs);
  }

  function copyDmgOptionsToTarget(target, options) {
    target.ignoreRD = options.ignoreRD;
    target.ignoreTouteRD = options.ignoreTouteRD;
    target.ignoreMoitieRD = options.ignoreMoitieRD;
    target.tempDmg = options.tempDmg;
    target.attaquant = options.lanceur;
  }

  //renvoie un objet avec le champ carac (+carac2 possible), et undefined si erreur
  function parseCarac(arg) {
    if (arg.length == 3) {
      if (!isCarac(arg)) return;
      return {
        carac: arg
      };
    } else if (arg.length == 6) { //Choix parmis 2 caracs
      let carac = arg.substr(0, 3);
      let carac2 = arg.substr(3, 3);
      if (!isCarac(carac) || !isCarac(carac2)) return;
      return {
        carac,
        carac2
      };
    }
  }

  //Retourne un objet avec
  // - carac, et possiblement carac2 (si on a le choix)
  // - seuil
  function parseSave(cmd) {
    if (cmd.length < 3) {
      if (cmd.length > 0)
        error("Usage : --" + cmd[0] + " carac seuil", cmd);
      else
        error("parsing de sauvegarde", cmd);
      return;
    }
    const res = parseCarac(cmd[1]);
    if (res === undefined) {
      error("Le premier argument de save n'est pas une caractéristique", cmd);
      return;
    }
    res.seuil = parseInt(cmd[2]);
    if (isNaN(res.seuil)) {
      error("Le deuxième argument de --psave n'est pas un nombre", cmd);
      return;
    }
    if (cmd.length > 3) {
      let optArgs = cmd.slice(3).join(' ');
      optArgs = optArgs.split(' +');
      optArgs.forEach(function(oa) {
        oa = oa.trim().split(' ');
        switch (oa[0]) {
          case 'carac':
          case 'carac2':
          case 'seuil':
            error("Argument supplémentaire de save inconnu", cmd);
            return;
          case 'tempete':
            let ti = 1;
            if (oa.length > 1) {
              ti = toInt(oa[1], 1);
            }
            res.tempete = ti;
            return;
          case 'contact':
            if (oa.length < 2) {
              error("Il manque la difficulté pour les cibles au contact");
              return;
            }
            let diff = parseInt(oa[1]);
            if (isNaN(diff)) {
              error("La difficulté pour les cibles au contact n'est pas un nombre");
              return;
            }
            res.contact = diff;
            return;
          default:
            res[oa[0]] = true;
        }
      });
    }
    return res;
  }

  function selectionOption(cmd, options, optionString) {
    options.selection.push(cmd);
  }

  function booleanOption(cmd, options, optionString) {
    options[cmd[0]] = true;
  }

  function integerOption(cmd, options, optionString) {
    if (cmd.length < 2) {
      error("Il manque la valeur de l'option " + cmd[0], optionString);
      return;
    }
    let d = parseInt(cmd[1]);
    if (isNaN(d)) {
      error("La valeur de l'option " + cmd[0] + " devrait être un nombre entier", optionString);
      return;
    }
    options[cmd[0]] = d;
  }

  const optionTable = {
    'equipe': selectionOption,
    'allies': selectionOption,
    'saufAllies': selectionOption,
    'self': selectionOption,
    'target': selectionOption,
    'disque': selectionOption,
    'disquePasseMur': selectionOption,
    'enVue': selectionOption,
    'alliesEnVue': selectionOption,
    'asphyxie': booleanOption,
    'affute': booleanOption,
    "metal": booleanOption,
    'magique': booleanOption,
    'artificiel': booleanOption,
    'tranchant': booleanOption,
    'percant': booleanOption,
    'contondant': booleanOption,
    'tempDmg': booleanOption,
    'mortsVivants': booleanOption,
    'ignoreMoitieRD': booleanOption,
    'maxDmg': booleanOption,
    'sortilege': booleanOption,
    'listeCompetences': booleanOption,
    deBonus: booleanOption,
    deMalus: booleanOption,
    forceReset: booleanOption,
    nature: booleanOption,
    secret: booleanOption,
    difficulte: integerOption,
    bonus: integerOption,
    plageEchecCritique: integerOption,
  };

  //Renseigne toujours options.playerId
  function parseOptions(optionString, pageId, options = {}, scope = options) {
    options.selection = options.selection || [];
    const opts = optionString.split(' --');
    opts.forEach(function(arg) {
      let cmd = arg.trim().split(' ');
      cmd = cmd.filter(function(c) {
        return c !== '';
      });
      let f = optionTable[cmd[0]];
      if (f) {
        f(cmd, options, optionString);
        return;
      }
      switch (cmd[0]) {
        case 'enflamme':
          scope[cmd[0]] = true;
          return;
        case 'psave':
          let psaveopt = options;
          if (options.additionalDmg && cmd.length > 3 && cmd[3] == 'local') {
            let psavel = options.additionalDmg.length;
            if (psavel > 0) {
              psaveopt = options.additionalDmg[psavel - 1];
            }
          }
          let psaveParams = parseSave(cmd);
          if (psaveParams) {
            psaveopt.partialSave = psaveParams;
          }
          return;
        case 'feu':
        case 'froid':
        case 'acide':
        case 'electrique':
        case 'sonique':
        case 'poison':
        case 'maladie':
        case 'argent':
        case 'energie':
          if (options.additionalDmg) {
            let l = options.additionalDmg.length;
            if (l > 0) {
              options.additionalDmg[l - 1].type = cmd[0];
            } else {
              options.type = cmd[0];
            }
          } else options.type = cmd[0];
          return;
        case 'naturel':
          options.nature = true;
          return;
        case 'vampirise':
          {
            let vampirise = 100;
            if (cmd.length > 1) {
              vampirise = parseInt(cmd[1]);
              if (isNaN(vampirise)) {
                error("Il faut un pourcentage entier comme argument à --vampirise", cmd);
                vampirise = 100;
              }
            }
            options.vampirise = vampirise;
            return;
          }
        case "ignoreRD":
          if (cmd.length < 2) {
            options.ignoreTouteRD = true;
            return;
          }
          options.ignoreRD = parseInt(cmd[1]);
          if (isNaN(options.ignoreRD) || options.ignoreRD < 1) {
            log("Pas un nombre positif après --ignoreRD, interprété comme ignore toute la RD");
            options.ignoreRD = undefined;
            options.ignoreTouteRD = true;
          }
          return;
        case 'onlySelection':
          {
            if (cmd.length < 2) {
              error("Manque l'argument de --" + cmd[0] + ", option ignorée", arg);
              return;
            }
            options[cmd[0]] = cmd[1];
            return;
          }
        case 'attaquant':
          {
            if (cmd.length < 2) {
              error("Manque l'id de --" + cmd[0] + ", option ignorée", arg);
              return;
            }
            const perso = persoOfId(cmd[1], cmd[1], pageId);
            if (perso) {
              options[cmd[0]] = perso;
              return;
            }
            error("Token non trouvé", cmd);
            return;
          }
        case 'titre':
          if (cmd.length < 2) {
            error("Il manque le message après --titre", optionString);
            return;
          }
          options.titre = cmd.slice(1).join(' ');
          return;
        case 'commande':
          options.commande = cmd.slice(1);
          return;
        case 'competence':
          if (cmd.length < 2) {
            error("Il manque un argument à l'option " + cmd[0], optionString);
            return;
          }
          cmd.shift();
          let competence = cmd.join(' ');
          if (options.competence && options.competence != competence) {
            error("Compétence définie deux fois !", options.competence);
          }
          options.competence = competence;
          return;
        case 'attribut':
          if (cmd.length < 2) {
            error("Il manque un argument à l'option " + cmd[0], optionString);
            return;
          }
          options.bonusAttrs.push(cmd[1]);
          return;
        case 'predicat':
          if (cmd.length < 2) {
            error("Il manque un argument à l'option " + cmd[0], optionString);
            return;
          }
          options.bonusPreds.push(cmd[1]);
          return;
        case 'succes':
          options.messageSiSucces = cmd.slice(1).join(' ');
          return;
        default:
          error("Option " + cmd[0] + " inconnue", cmd);
      }
    });
    return options;
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

  function removeTokenActif(tid, pageId) {
    let ta = stateCOF.tokensActifs;
    ta[pageId] = ta[pageId].filter(function(tt) {
      return tt.tid != tid;
    });
    if (ta[pageId] == []) delete ta[pageId];
  }

  function distanceTokenPrev(token, prev) {
    let x = token.get('left') - prev.left;
    let y = token.get('top') - prev.top;
    return Math.sqrt(x * x + y * y);
  }

  function moveToken(token, prev, synchronisation, suivis) {
    let charId = token.get('represents');
    if (charId === '') return;
    let perso = {
      token,
      charId
    };
    let pageId = token.get('pageid');
    let x = token.get('left');
    let y = token.get('top');
    let deplacement = prev && (prev.left != x || prev.top != y);
    if (!deplacement) {
      //On essaie de réparer les barres liées
      let attrId = token.get('bar2_link');
      if (!attrId) return;
      let attr = getObj('attribute', attrId);
      if (!attr) return;
      let v = attr.get('current');
      if (prev && v == prev.bar2_value && v != token.get('bar2_value')) {
        token.set('bar2_value', v);
      }
      return;
    }
    //Effet des bombes à intrusion
    if (stateCOF.tokensTemps) {
      let collisions = [];
      let pt_arrivee = {
        x,
        y
      };
      let pt_depart = {
        x: prev.left,
        y: prev.top
      };
      let rayon = tokenSizeAsCircle(token) / 2;
      stateCOF.tokensTemps.forEach(function(tt) {
        if (!tt.intrusion) return;
        //tt.intrusion est exprimé en pixels
        let bombe = getTokenTemp(tt, pageId);
        if (!bombe) return;
        if (bombe.get('pageid') != pageId) return;
        let pb = pointOfToken(bombe);
        let distance = distancePoints(pt_depart, pb);
        if (distance < tt.intrusion) return; //On est parti de la zone de départ
        let distToTrajectory =
          distancePixTokenSegment(bombe, pt_depart, pt_arrivee);
        if (distToTrajectory > tt.intrusion + rayon) return;
        collisions.push({
          bombe,
          tt,
          distance
        });
      });
      if (collisions.length > 0) {
        collisions.sort(function(b1, b2) {
          let d1 = b1.distance;
          let d2 = b2.distance;
          if (d1 < d2) return -1;
          if (d2 < d1) return 1;
          return 0;
        });
        let bombe = collisions[0].bombe;
        x = bombe.get('left');
        y = bombe.get('top');
        token.set('left', x);
        token.set('top', y);
        const evt = {
          type: "Explosion de bombe"
        };
        deleteTokenTemp(collisions[0].tt, evt);
        stateCOF.tokensTemps = stateCOF.tokensTemps.filter(function(tt) {
          return tt.id == collisions[0].tt.id;
        });
      }
    }
    if (stateCOF.tokensActifs && stateCOF.tokensActifs[pageId]) {
      let pt_arrivee = {
        x,
        y
      };
      let pt_depart = {
        x: prev.left,
        y: prev.top
      };
      let rayon = tokenSizeAsCircle(token) / 2;
      let estTP;
      stateCOF.tokensActifs[pageId].forEach(function(tt) {
        if (estTP) return;
        let tp = getTokenTemp(tt, pageId);
        if (!tp) {
          removeTokenActif(tt.id, pageId);
          return;
        }
        if (tt.rayon === undefined) {
          if (!(intersection(x, token.get('width'), tp.get('left'), tp.get('width')) &&
              intersection(y, token.get('height'), tp.get('top'), tp.get('height')))) return;
        } else {
          let pb = pointOfToken(tp);
          let distance = distancePoints(pt_depart, pb);
          if (distance < tt.rayon) return; //On est parti de la zone de départ
          let distToTrajectory =
            distancePixTokenSegment(tp, pt_depart, pt_arrivee);
          if (distToTrajectory > tt.rayon + rayon) return;
        }
        let s = trouveSortieEscalier(tp, true, false);
        if (!s || !s.sortieEscalier) s = trouveSortieEscalier(tp, false, false);
        if (!s || !s.sortieEscalier) return;
        prendreEscalier(perso, pageId, s.sortieEscalier);
        estTP = true;
      });
      if (estTP) return;
    }
    if (!synchronisation) {
      let deplacementsSynchronises = tokenAttribute(perso, 'tokensSynchronises');
      deplacementsSynchronises.forEach(function(attr) {
        let listTokens = attr.get('current');
        listTokens.split(',').forEach(function(tid) {
          if (tid == token.id) return;
          let tok = getObj('graphic', tid);
          if (tok === undefined) {
            error("Impossible de trouver le token d'id " + tid + " synchronisé avec " + token.get('name'), attr);
            return;
          }
          tok.set('left', x);
          tok.set('top', y);
          moveToken(tok, prev, true);
        });
      });
    }
    suivis = suivis || new Set();
    let nomToken = token.get('name');
    if (nomToken.startsWith('decoince ')) {
      let originalToken = findObjs({
        _type: 'graphic',
        _pageid: pageId,
        represents: charId,
        name: nomToken.substring(9)
      });
      if (originalToken.length === 0) return;
      originalToken = originalToken[0];
      let sprev = {
        left: originalToken.get('left'),
        top: originalToken.get('top'),
        rotation: originalToken.get('rotation'),
      };
      originalToken.set('left', x);
      originalToken.set('top', y);
      originalToken.set('rotation', token.get('rotation'));
      moveToken(originalToken, sprev, synchronisation, suivis);
      return;
    }
    //On regarde d'abord si perso est sur une monture
    let attrMonteSur = tokenAttribute(perso, 'monteSur');
    if (attrMonteSur.length > 0) {
      let monture = persoOfIdName(attrMonteSur[0].get('current'), pageId, true);
      if (monture === undefined) {
        sendPerso(perso, "descend de sa monture");
        attrMonteSur[0].remove();
      } else {
        if (monture.token.get('pageid') != pageId || monture.token.get('lockMovement')) {
          sendPerso(perso, "descend de " + nomPerso(monture));
          removeTokenAttr(monture, 'estMontePar');
          removeTokenAttr(monture, 'positionSurMonture');
          attrMonteSur[0].remove();
        } else if (!suivis.has(monture.token.id)) {
          let position = tokenAttribute(monture, 'positionSurMonture');
          if (position.length > 0) {
            let dx = parseInt(position[0].get('current'));
            let dy = parseInt(position[0].get('max'));
            if (!(isNaN(dx) || isNaN(dy))) {
              let sprev = {
                left: monture.token.get('left'),
                top: monture.token.get('top'),
              };
              monture.token.set('left', x - dx);
              monture.token.set('top', y - dy);
              monture.token.set('rotation', token.get('rotation') - attributeAsInt(monture, 'directionSurMonture', 0));
              suivis.add(token.id);
              moveToken(monture.token, sprev, synchronisation, suivis);
            }
          }
        }
        if (stateCOF.combat) {
          const evt = {
            type: "initiative"
          };
          updateInit(monture.token, evt);
          // Réadapter l'init_dynamique au token du perso
          if (stateCOF.options.affichage.val.init_dynamique.val) {
            threadSync++;
            activateRoundMarker(threadSync, perso.token);
          }
        }
      }
    }
    //Si il est invisible, on bouge aussi l'autre token
    let attrInvisible = tokenAttribute(perso, 'tokenInvisible');
    if (attrInvisible.length > 0) {
      attrInvisible = attrInvisible[0];
      let tidInv1 = attrInvisible.get('current'); //Originel, normalement sur le gmlayer
      let tidInv2 = attrInvisible.get('max');
      let autreInvisible;
      if (token.id == tidInv1) {
        autreInvisible = getObj('graphic', tidInv2);
        if (!autreInvisible) {
          autreInvisible =
            findObjs({
              _type: 'graphic',
              _subtype: 'token',
              _pageid: token.get('pageid'),
              layer: 'objects',
              represents: perso.charId,
              name: token.get('name')
            });
          if (autreInvisible.length > 0) autreInvisible = autreInvisible[0];
          else autreInvisible = undefined;
        }
      } else if (token.id == tidInv2) {
        autreInvisible = getObj('graphic', tidInv1);
        if (!autreInvisible) {
          autreInvisible =
            findObjs({
              _type: 'graphic',
              _subtype: 'token',
              _pageid: token.get('pageid'),
              layer: 'gmlayer',
              represents: perso.charId,
              name: token.get('name')
            });
          if (autreInvisible.length > 0) autreInvisible = autreInvisible[0];
          else autreInvisible = undefined;
        }
      }
      if (!autreInvisible) {
        switch (token.get('layer')) {
          case 'objects':
            autreInvisible =
              findObjs({
                _type: 'graphic',
                _subtype: 'token',
                _pageid: token.get('pageid'),
                layer: 'gmlayer',
                represents: perso.charId,
                name: token.get('name')
              });
            if (autreInvisible.length > 0) autreInvisible = autreInvisible[0];
            else autreInvisible = undefined;
            break;
          case 'gmlayer':
            autreInvisible =
              findObjs({
                _type: 'graphic',
                _subtype: 'token',
                _pageid: token.get('pageid'),
                layer: 'objects',
                represents: perso.charId,
                name: token.get('name')
              });
            if (autreInvisible.length > 0) autreInvisible = autreInvisible[0];
            else autreInvisible = undefined;
            break;
          default:
            error("Impossible de trouver la couche du token " + token.get('name'), token);
        }
      }
      if (autreInvisible) {
        autreInvisible.set('left', x);
        autreInvisible.set('top', y);
      }
    }
    //si non, perso est peut-être une monture
    let attrMontePar = tokenAttribute(perso, 'estMontePar');
    attrMontePar.forEach(function(a) {
      let cavalier = persoOfIdName(a.get('current'), pageId);
      if (cavalier === undefined) {
        a.remove();
        return;
      }
      if (!suivis.has(cavalier.token.id)) {
        let position = tokenAttribute(perso, 'positionSurMonture');
        if (position.length > 0) {
          let dx = parseInt(position[0].get('current'));
          let dy = parseInt(position[0].get('max'));
          if (!(isNaN(dx) || isNaN(dy))) {
            x += dx;
            y += dy;
          }
        }
        cavalier.token.set('left', x);
        cavalier.token.set('top', y);
        cavalier.token.set('rotation', token.get('rotation') + attributeAsInt(perso, 'directionSurMonture', 0));
      }
    });
    //Si le token suivait quelqu'un, ce n'est plus le cas
    if (prev.suit === undefined) nePlusSuivre(perso, pageId);
    //On bouge tous les tokens qui suivent le personnage
    //sauf si on a déjà été bougé.
    if (!suivis.has(token.id)) {
      suivis.add(token.id);
      let attrSuivi = tokenAttribute(perso, 'estSuiviPar');
      let page = getObj('page', pageId);
      if (page === undefined) {
        error("Impossible de trouver la page du token", perso);
        return;
      }
      if (attrSuivi.length > 0) {
        let width = page.get('width') * PIX_PER_UNIT;
        let height = page.get('height') * PIX_PER_UNIT;
        let pt = {
          x: x,
          y: y
        };
        let murs = getWalls(page, pageId, prev.murs);
        let distance =
          Math.sqrt((x - prev.left) * (x - prev.left) + (y - prev.top) * (y - prev.top));
        attrSuivi.forEach(function(as) {
          let suivants = as.get('current').split(':::');
          let removedSuivant;
          suivants = suivants.filter(function(idn) {
            let suivant = persoOfIdName(idn, pageId);
            if (suivant === undefined) {
              removedSuivant = true;
              return false;
            }
            let sw = suivant.token.get('width');
            let sh = suivant.token.get('height');
            if (sw > width) return false;
            if (sh > width) return false;
            let sx = suivant.token.get('left');
            let sy = suivant.token.get('top');
            //On essaie de garder la même position par rapport au token, en supposant qu'on était derrière lui
            let attrSuit = tokenAttribute(suivant, 'suit');
            let dp;
            if (attrSuit.length > 0) {
              dp = parseInt(attrSuit[0].get('max'));
            }
            if (dp === undefined || isNaN(dp) || dp < 1) {
              dp = Math.sqrt((prev.left - sx) * (prev.left - sx) + (prev.top - sy) * (prev.top - sy));
            }
            let nsx = x + (prev.left - x) * dp / distance;
            let nsy = y + (prev.top - y) * dp / distance;
            if (nsx < 0) nsx = 0;
            if (nsy < 0) nsy = 0;
            if (nsx + sw / 2 > width) nsx = Math.floor(width - sw / 2);
            if (nsy + sh / 2 > height) nsy = Math.floor(height - sh / 2);
            //vérifie si de la nouvelle position on peut voir le suivi
            if (obstaclePresent(nsx, nsy, pt, murs)) {
              //On essaie de suivre le chemin du token, à la place
              //D'abord se déplacer vers l'ancienne position de perso, au maximum de distance pixels
              let distLoc = distance;
              if (distLoc - dp < 5) {
                nsx = prev.left;
                nsy = prev.top;
              } else {
                if (dp > distLoc) {
                  nsx = sx + (prev.left - sx) * distLoc / dp;
                  nsy = sy + (prev.top - sy) * distLoc / dp;
                  if (obstaclePresent(nsx, nsy, pt, murs)) {
                    sendPerso(suivant, "ne peut plus suivre " + nomPerso(perso) + " car " + onGenre(suivant, 'il', 'elle') + " ne " + onGenre(perso, 'le', 'la') + " voit plus");
                    removeTokenAttr(suivant, 'suit');
                    removedSuivant = true;
                    return false;
                  }
                } else {
                  //On part de l'ancienne position, et on peut encore avancer
                  distLoc -= dp;
                  nsx = prev.left + (x - prev.left) * distLoc / distance;
                  nsy = prev.top + (y - prev.top) * distLoc / distance;
                  if (obstaclePresent(nsx, nsy, pt, murs)) {
                    nsx = prev.left;
                    nsy = prev.top;
                  }
                }
              }
            }
            suivant.token.set('left', nsx);
            suivant.token.set('top', nsy);
            let sprev = {
              left: sx,
              top: sy,
              suit: true,
              murs: murs
            };
            moveToken(suivant.token, sprev, synchronisation, suivis); //pour faire suivre ceux qui le suivent
            return true;
          });
          if (removedSuivant) {
            if (suivants.length === 0) {
              as.remove();
            } else {
              as.set('current', suivants.join(':::'));
            }
          }
        });
      }
    }
    // Update position du token d'initiative dynamique
    let combat = stateCOF.combat;
    if (stateCOF.options.affichage.val.init_dynamique.val && roundMarker &&
      combat) {
      if ((!stateCOF.chargeFantastique && combat.activeTokenId == token.id) ||
        (stateCOF.chargeFantastique && stateCOF.chargeFantastique.activeTokenId == token.id)) {
        roundMarker.set('left', x);
        roundMarker.set('top', y);
      } else {
        // Cas spéciaux du cavaliers : au tour du cavalier, l'init_dynamique suit la monture
        let estMontePar = tokenAttribute(perso, 'estMontePar');
        if (estMontePar.length > 0) {
          let sp = splitIdName(estMontePar[0].get('current'));
          if (sp && combat.activeTokenId == sp.id) {
            let cavalier = persoOfId(sp.id);
            roundMarker.set('left', cavalier.token.get('left'));
            roundMarker.set('top', cavalier.token.get('top'));
          }
        }
      }
    }
    //On déplace les tokens de lumière, si il y en a
    let attrLumiere = tokenAttribute(perso, 'lumiere');
    attrLumiere.forEach(function(al) {
      let lumId = al.get('max');
      if (lumId == 'surToken') return;
      let lumiereExiste;
      let lumiere = getObj('graphic', lumId);
      if (lumiere && lumiere.get('pageid') != pageId) {
        lumiere = undefined;
        lumiereExiste = true;
      }
      if (lumiere === undefined) {
        let tokensLumiere = findObjs({
          _type: 'graphic',
          _pageid: pageId,
          layer: 'walls',
          name: al.get('current')
        });
        if (tokensLumiere.length === 0) {
          if (lumiereExiste) return;
          log("Pas de token pour la lumière " + al.get('current'));
          al.remove();
          return;
        }
        lumiere = tokensLumiere.shift();
        if (tokensLumiere.length > 0) {
          //On cherche le token le plus proche de la position précédente
          let d = distanceTokenPrev(lumiere, prev);
          tokensLumiere.forEach(function(tl) {
            let d2 = distanceTokenPrev(tl, prev);
            if (d2 < d) {
              d = d2;
              lumiere = tl;
            }
          });
        }
      }
      if (lumiere === undefined) {
        if (lumiereExiste) return;
        log("Pas de token pour la lumière " + al.get('current'));
        al.remove();
        return;
      }
      lumiere.set('left', x);
      lumiere.set('top', y);
    });
    let attrEnveloppe = tokenAttribute(perso, 'enveloppe');
    attrEnveloppe = attrEnveloppe.concat(tokenAttribute(perso, 'aGobe'));
    attrEnveloppe = attrEnveloppe.concat(tokenAttribute(perso, 'ecrase'));
    attrEnveloppe.forEach(function(a) {
      let cible = persoOfIdName(a.get('current'), pageId);
      if (cible === undefined) {
        a.remove();
        return;
      }
      cible.token.set('left', x);
      cible.token.set('top', y);
    });
  }

  function tokenChanged(token, prev, synchronisation, suivis) {
    moveToken(token, prev);
  }

  //Pour enlever les attributs de mooks non utilisés
  function tokenDestroyed(token) {
    let charId = token.get('represents');
    if (charId === '') return;
    let perso = {
      charId,
      token
    };
    let pageId = token.get('pageid');
    let nomToken = token.get('name');
    if (nomToken.startsWith('decoince ')) {
      let originalToken = findObjs({
        _type: 'graphic',
        _pageid: pageId,
        represents: charId,
        name: nomToken.substring(9)
      });
      if (originalToken.length === 0) return;
      perso.token = originalToken[0];
      removeTokenAttr(perso, 'bougeGraceA');
      return;
    }
    //On regarde si il existe une copie de ce token, par exemple à cause de l'invisibilité
    let otherTokens = findObjs({
      _type: 'graphic',
      _pageid: pageId,
      represents: charId,
      name: nomToken
    });
    if (otherTokens.length > 0) return;
    let tokenBougeAttr = tokenAttribute(perso, 'bougeGraceA');
    tokenBougeAttr.forEach(function(a) {
      let tokenBouge = getObj('graphic', a.get('current'));
      if (tokenBouge) {
        tokenBouge.remove();
      } else {
        tokenBouge = findObjs({
          _type: 'graphic',
          _pageid: pageId,
          represents: charId,
          name: 'decoince ' + token.get('name')
        });
        if (tokenBouge.length > 0) {
          tokenBouge = tokenBouge[0];
          tokenBouge.remove();
        }
      }
      a.remove();
    });
    nePlusSuivre(perso, pageId);
    let deplacementsSynchronises = tokenAttribute(perso, 'tokensSynchronises');
    let keepToken;
    deplacementsSynchronises.forEach(function(attr) {
      let listTokens = attr.get('current').split(',');
      listTokens = listTokens.filter(function(tid) {
        return tid != token.id;
      });
      if (listTokens.length < 2) attr.remove();
      else keepToken = true;
    });
    if (keepToken || token.get('bar1_link') !== '') return;
    let endName = "_" + token.get('name');
    let tokAttr = findObjs({
      _type: 'attribute',
      _characterid: charId
    });
    tokAttr = tokAttr.filter(function(obj) {
      return obj.get('name').endsWith(endName);
    });
    if (tokAttr.length > 0) {
      log("Removing token local attributes");
      log(tokAttr);
      tokAttr.forEach(function(attr) {
        attr.remove();
      });
    }
  }

  function isCarac(x) {
    return nomDeCarac[x];
  }

  function parseHandout(hand) {
    const handName = hand.get('name').trim();
    if (handName == 'Compétences' || handName == 'Competences') {
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

  function handoutChanged(hand, prev) {
    if (hand) {
      parseHandout(hand);
    }
  }

  function characterChanged(character, prev) {
    if (character.get('controlledby').length === 0) {
      if (prev && prev.controlledby.length > 0) {
        delete stateCOF.equipes.joueurs.membres[character.id];
        if (stateCOF.equipes.joueurs.alliance) {
          recomputeAlliesParPerso(character.id);
        }
      }
    } else {
      if (!prev || prev.controlledby.length === 0) {
        if (stateCOF.equipes.joueurs.alliance) {
          alliesParPerso[character.id] = alliesParPerso[character.id] || new Set();
          for (const pj in stateCOF.equipes.joueurs.membres) {
            alliesParPerso[character.id].add(pj);
            alliesParPerso[pj].add(character.id);
          }
        }
        stateCOF.equipes.joueurs.membres[character.id] = true;
      }
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

  const commandes = {
    'allier': commandeAllier,
    'bouger': commandeBouger,
    'bouton-chance': commandeBoutonChance,
    'centrer-sur-token': commandeCentrerSurToken,
    'escalier': commandeEscalier,
    'eteindre-lumiere': commandeEteindreLumiere,
    'fin-combat': commandeFinCombat,
    'gerer-equipe': commandeGererEquipe,
    'jet': commandeJet,
    'jet-chance': commandeJetChance,
    'jouer-son': commandeJouerSon,
    'init': commandeInit,
    'lister-equipes': commandeListerEquipes,
    'open-door': commandeOpenDoor,
    'options': commandeOptions,
    'pause': commandePause,
    'reveler-nom': commandeRevelerNom,
    'set-macros': commandeSetMacros,
    'undo': commandeUndo,
  };

  function treatCommand(msg) {
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
    let cmd = msg.content;
    let options = {
      selection: []
    };
    let indexOpt = msg.content.indexOf(' --');
    if (indexOpt > 0) {
      cmd = msg.content.substring(0, indexOpt);
      let optionString = msg.content.substring(indexOpt + 3);
      options = parseOptions(optionString, pageId);
    }
    cmd = cmd.split(' ');
    cmd = cmd.filter(function(c) {
      return c !== '';
    });
    let c = cmd[0].substring(6);
    let f = commandes[c];
    if (c) {
      f(msg, cmd, playerId, pageId, options);
    } else {
      error("Commande " + c + " inconnue", cmd);
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
    tokenDestroyed,
    tokenChanged,
    attributeChanged,
    handoutChanged,
    characterChanged,
    tokenLockChanged,
    statusMarkersChanged,
    doorChanged,
    playerPageChanged,
    nextTurn,
  };
}();

on('ready', function() {
  COFantasy2.initializeGlobalState();
  COF2_loaded = true;
  //Maintenant ce qui écoute les événements
  on('chat:message', COFantasy2.apiCommand);
  on('add:token', COFantasy2.tokenAdded);
  on('destroy:token', COFantasy2.tokenDestroyed);
  on('change:token', COFantasy2.tokenChanged);
  on('add:character', COFantasy2.scriptVersionToCharacter);
  on('change:attribute', COFantasy2.attributeChanged);
  on('change:handout', COFantasy2.handoutChanged);
  on('change:character', COFantasy2.characterChanged);
  on('change:graphic:lockMovement', COFantasy2.tokenLockChanged);
  on('change:graphic:statusmarkers', COFantasy2.statusMarkersChanged);
  on('change:door:isOpen', COFantasy2.doorChanged);
  on('change:campaign:playerpageid', COFantasy2.playerPageChanged);
  on('change:campaign:turnorder', COFantasy2.nextTurn);
  //Initialisation terminée, message dans la console
  let load_msg = "COFantasy2 version " + state.COFantasy.version;
  if (COF2_BETA) load_msg += ' beta';
  log(load_msg + " loaded");
});
