/* My Style — La méthode de stylisme d'Imen est maintenant CÔTÉ SERVEUR (v180) : worker/methode.js.
   Elle n'est plus publiée dans l'application (avant, n'importe qui pouvait la lire en ouvrant ce fichier).
   Ici, REF et REFP ne sont que des repères : le Worker les remplace par la méthode avant d'appeler l'IA.
   Pour mettre à jour la méthode avec de nouveaux cours : modifie worker/methode.js, pas ce fichier.
   Chargé AVANT le script principal. */
const REF="§REF§";
// REFP("VISAGISME","KIBBE") = seulement ces rubriques de la méthode (titres en majuscules de worker/methode.js).
const REFP=(...k)=>"§REFP:"+k.join("|")+"§\n";
