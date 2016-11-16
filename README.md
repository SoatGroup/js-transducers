# Les transducers, un map-reduce sans collections temporaires

Le pattern fonctionnel `map-reduce` est désormais largement répandu dans tous les langages majeurs (Java, C#, javascript...). 

Nous commencerons par un rappel de ce pattern et regarderons de plus près les impacts de son utilisation sur l'exécution de notre code.
Puis nous verrons qu'il est possible d'exprimer toutes les fonctions avec `reduce`.
Enfin nous exploiterons cette possibilité afin d'éviter les collections temporaires.  

Dans cet article, nous utiliserons javascript (ES6) pour nos illustrations et le framework [mocha][https://mochajs.org/] pour écrire nos tests unitaires.
L'ensemble du code peut être trouvé [sur notre github](https://github.com/SoatGroup/js-transducers).
Après un `npm install`, la commande `npm test` executera les tests.


# Map-reduce et sa consommation mémoire

Le pattern map-reduce est un pattern de programmation fonctionnelle qui s'applique à des collections pour permettre de les filtrer, de transformer leurs valeurs et d'y appliquer des calculs.

Illustrons ces trois concepts avec des exemples. Prenons la collection de nombres suivante :

```javascript
const numbers = [1, 2, 10, 23, 238];
```


## Filter

Nous pouvons filtrer cette collection pour ne garder que les nombres pairs :

```javascript
describe('filter', () => {
    it('creates a new filtered collection', () => {
        numbers.filter((i) => i % 2 == 0).should.deep.equal(evenNumbers);
    });
});
```

où `evenNumbers` est défini ainsi :

```javascript
const evenNumbers = [2, 10, 238];
```

## Map

Nous pouvons transformer les valeurs de cette collection en les multipliant par deux :

```javascript
describe('map', () => {
    it('creates a new transformed collection', () => {
        numbers.map((i) => i * 2).should.deep.equal(numbersTimesTwo);
    });
});
```

où `numbersTimesTwo` est défini ainsi :

```javascript
const numbersTimesTwo = [2, 4, 20, 46, 476];
```

## Reduce

Nous pouvons calculer la somme des nombres :

```javascript
describe('reduce', () => {
    it('computes a value', () => {
        numbers.reduce((accumulator, element) => accumulator + element, 0).should.equal(274);
    });
});
```


## Enchaînement

Enfin, nous pouvons enchaîner ces fonctions pour faire des calculs plus complexes :

```javascript
describe('Existing functions :', () => {
    it('can be chained', () => {
        numbers.filter((i) => i % 2 == 0)
            .map((i) => i * 2)
            .reduce((accumulator, element) => accumulator + element, 0).should.equal(500);
    });
});
```

Ici, vous l'aurez compris, nous conservons les nombres pairs, les multiplions par deux et faisons la somme de ces derniers.

## Gestion mémoire et reactive programming

Bien, maintenant que nous sommes à l'aise avec ces concepts, passons aux choses sérieuses!

Dans notre dernier exemple, il est important de noter qu'une nouvelle collection est créée à chaque appel de fonction. Nous créons donc deux collections temporaires.
La consommation mémoire n'est pas un problème en soit : nos machines actuelles gèrent très bien un important volume de données ainsi que les variables temporaires.
Cependant, cela prend une toute autre importance quand nous regardons cela sous le prisme du [*reactive programming*](https://en.wikipedia.org/wiki/Reactive_programming).

Le paradigme du *reactive programming* repose sur la capacité de traîter les données au fur et à mesure de leur disponibilité : c'est la notion de *data flow*.
Or dans notre cas, nous devons attendre que chaque collection temporaire ait fini d'être calculée pour pouvoir passer à l'étape suivante.

Si nous représentons chaque étape par un flèche jaune et chaque élément de notre liste par un trait rouge, nous obtenons un schéma d'execution comme ceci:

![Filter Map Reduce créeent des collections temporaires](https://cdn-images-1.medium.com/max/800/1*mJicJiOZT4M9jwv6kMkwRg.gif "Mode de fonctionnement actuel")

# En route vers les transducers

## Reduce à la loupe

`Reduce` a pour but de produire un résultat unique à partir d'une collection. Mais cette définition peut être abusée en considérant une collection comme étant un résultat à part entière. Ainsi, nous pouvons utiliser `reduce` pour produire une nouvelle collection :

```javascript
describe('Alternative uses of reduce', () => {
    it('can be used to creates a new collection', () => {
        numbers.reduce((accumulator, element) => accumulator.concat(element), []).should.not.equal(numbers);
        numbers.reduce((accumulator, element) => accumulator.concat(element), []).should.deep.equal(numbers);
    });
});
```

Ceci a peu d'intérêt dans un premier temps, je vous l'accorde. Mais en utilisant cette propriété, nous nous rendons compte que :

 * nous pouvons réécrire la fonction `filter` à partir de `reduce` :
 
```javascript
it('can emulates filter', () => {
    numbers.reduce((accumulator, element) => element % 2 == 0 ? accumulator.concat(element) : accumulator, [])
        .should.deep.equal(evenNumbers);
});
```

 * nous pouvons réécrire la fonction `map` à partir de `reduce` :
 
```javascript
it('can emulates map and transform data', () => {
    numbers.reduce((accumulator, element) => accumulator.concat(element * 2), [])
        .should.deep.equal(numbersTimesTwo);
});
```

Si nous regardons notre implémentation, nous constatons qu'en fonction du cas d'usage de `reduce` la fonction passée en argument aura toujours la même forme.

## Montons de niveau

Nous pouvons alors définir des fonctions de plus haut niveau (higher order functions) pour mutualiser cette information (principe DRY).

```javascript
const reducer = (accumulator, element) => accumulator.concat(element);

const filterer = (predicate) => {
    return (accumulator, element) => predicate(element) ? accumulator.concat(element) : accumulator
};

const mapper = (transform) => {
    return (accumulator, element) => accumulator.concat(transform(element))
};
```

Ainsi, seule l'information du comportement devient importante (comme avec les trois fonctions `filter`,`map`,`reduce`) :

Nous pouvons réécrire nos exemples :

```javascript
describe('Reducer', () => {
    it('is a function passed to reduce', () => {
        numbers.reduce(reducer, []).should.not.equal(numbers);
        numbers.reduce(reducer, []).should.deep.equal(numbers);
    });
});

describe('Filterers', () => {
    it('use reduce to filter data', () => {
        numbers.reduce(filterer((i) => i % 2 == 0), []).should.deep.equal(evenNumbers);
    });
});

describe('Mappers', () => {
    it('use reduce to transform data', () => {
        numbers.reduce(mapper((element) => element * 2), []).should.deep.equal(numbersTimesTwo);
    });
});
```

Jusqu'ici, nous créeons toujours des collections temporaires et avons même réduit (légèrement) la lisibilité du code. Cependant, une nouvelle possibilité s'offre à nous : si nous arrivons à *composer nos fonctions* `reducer`, `filterer` et `mapper`, alors nous n'aurons plus qu'une seule fonction à passer à `reduce` et éviterons ainsi les collections temporaires.

# Les transducers

## Chaîne de responsabilité

En regardant les définitions de nos trois fonctions, nous constatons une dernière répétition : l'appel à `accumulator.concat`. Or ce comportement ne nous interesse réellement que pour la fonction `reducer`.
Nous pouvons utiliser le pattern de chaîne de responsabilité (à la sauce fonctionnelle) pour éviter cette duplication. Il nous suffit de prendre un paramètre en plus : la prochaine fonction à appliquer sur l'élément que nous appellerons `nextReducer`.

```javascript
const reducer = (accumulator, element) => accumulator.concat(element);

const filtering = (predicate, nextReducer) => {
    return (accumulator, element) => predicate(element) ? nextReducer(accumulator, element) : accumulator;
};

const mapping = (transform, nextReducer) => {
    return (accumulator, element) => nextReducer(accumulator, transform(element));
};
```

Nous pouvons ainsi utiliser nos fonctions afin de construire un *transducer* :

```javascript
const transducer = filtering((i) => i % 2 == 0,
            mapping((element) => element * 2,
                reducer));
```

Nous n'avons plus qu'à le passer à `reduce` :

```javascript
describe('Transducers', () => {
    describe('using a simple implementation', () => {
        it('compose mappers, filterers and reducers together', () => {
            numbers.reduce(transducer, []).should.deep.equal(evenNumbersTimesTwo);
        });
    });
});
```

où `evenNumbersTimesTwo` est défini ainsi :

```javascript
const evenNumbersTimesTwo = [4, 20, 476];
```

Bien entendu, nous pouvons continuer à l'utiliser pour calculer notre somme :

```javascript
it('can be used to compute the same result as before', () => {
    numbers.reduce(filtering((i) => i % 2 == 0,
                    mapping((element) => element * 2,
                        (sum,element) => sum + element)), 0).should.deep.equal(500);
});
```

Il est important de noter que nous avons ici résolu notre problème de création de collections temporaires ! Si nous refaisons notre schéma d'exécution, nous obtenons :

![Les Transducers ne créent pas de collections temporaires](https://cdn-images-1.medium.com/max/800/1*rEOyWd0MTPv_NZvzDaFbkA.gif "Nouveau mode de fonctionnement")

Ceci étant dit, nous pouvons encore affiner notre implémentation.

## Curryfication

Nous pouvons aller encore un peu plus loin en modifiant légèrement notre dernière étape en faisant de la curryfication :

```javascript
const reducer = (accumulator, element) => accumulator.concat(element);

const filtering = (predicate) => {
    return (nextReducer) => (accumulator, element) => predicate(element) ? nextReducer(accumulator, element) : accumulator;
};

const mapping = (transform) => {
    return (nextReducer) => (accumulator, element) => nextReducer(accumulator, transform(element));
};
```

Ceci a pour seul effet direct de changer la syntaxe que nous utilisons pour notre `transducer` :

```javascript
const transducer = filtering((i) => i % 2 == 0)
                            (mapping((element) => element * 2)
                                (reducer));
```

Cependant, nous pouvons désormais faire de l'application partielle et stocker chaque étape de l'application dans une variable. Cela s'avèrera utile sous peu.

## La composition

Afin de pouvoir profiter au mieux de la curryfication, nous avons besoin de pouvoir composer des fonctions. Pour rappel, la composition de fonction consiste à prendre deux fonctions `f` et `g` pour en générer une troisième `h` telle que `h(arguments)=f(g(arguments))`.
Ce qui s'écrit très simplement :

```javascript
const compose = (f, g) => {
    return (i) => f(g(i));
};
```

Cette définition de `compose` est suffisante pour notre article bien que ne prenant que deux arguments. Nous laissons cette généralisation comme exercice au lecteur (et dans le repository github ;) ).

## L'application partielle

Nous pouvons alors utiliser la curryfication et la composition pour faire de l'application partielle de nos fonctions.
Si nous reprenons nos deux exemples d'utilisation de transducers, nous constatons que tout le transducer est répété à l'exception du dernier argument.
Nous pouvons éviter cela en créant une nouvelle fonction qui filtre et `map` mais attend un argument pour savoir comment faire le `reduce` :

```javascript
const evenAndDouble = compose(filtering((i) => i % 2 == 0), mapping((element) => element * 2));
```

Ce qui nous permet de définir deux transducers différents en ne se concentrant que sur leur différence :

```javascript
const transducer = evenAndDouble(reducer);
const sumer = evenAndDouble((sum,element) => sum + element);
```

Enfin, prouvons que tout cela marche :

```javascript
describe('Transducers', () => {
    describe('using curryfication and composition', () => {
        it('compose mappers, filterers and reducers together', () => {
            numbers.reduce(transducer, []).should.deep.equal(evenNumbersTimesTwo);
        });

        it('can be used to compute the same result as before', () => {
            numbers.reduce(sumer, 0).should.deep.equal(500);
        });
    })

});
```

# Conclusion

Les transducers sont une alternative intéressante au classique map-reduce qui produit le même résultat tout en étant plus cohérent avec le paradigme du *reactive programming*.
Le but de l'article était de dé-mystifier le sujet en le ré-implementant. Bien entendu, dans la vie de tous les jours, il est recommandé d'utiliser une librairie déja existante comme [transducers.js](https://github.com/cognitect-labs/transducers-js).
Enfin, tout comme le pattern *map-reduce*, ce pattern n'est pas exclusif à javascript et peut s'adapter à tous les languages ce qui est démontré par l'existance de beaucoup de librairies sur le sujet.

---
Les gifs animés ont été repris de [l'article de Roman Liutikov](https://medium.com/@roman01la/understanding-transducers-in-javascript-3500d3bd9624#.rty8u5pmt)
Cet article fait suite à la session d'[Arnaud](https://twitter.com/Lilobase) sur le sujet lors de [SoCraTes France](http://blog.soat.fr/2016/11/socrates-fr-16-retour-sur-une-non-conference/)
