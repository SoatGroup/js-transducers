# Les transducers, un map-reduce sans collections temporaires

Le pattern fonctionnel map-reduce est désomais commun. On le retrouve dans tous les languages majeurs (Java, C#, javascript,...). 

Dans cet article, nous utiliserons javascript (ES6) pour nos illustrations. L'ensemble du code peut être trouvé [sur le gitlab de soat](http://gitlab.soat.fr/craftsmanship/js-transducers). Après un `npm install`, la commande `npm test` executera les tests.

Nous commencerons par un rappel du pattern map-reduce et regarderons de plus prêt les impactes que cela a sur l'execution de notre code. Puis nous verrons que nous que toutes les fonctions sont exprimables avec `reduce`. Enfin nous exploiterons cela afin d'éviter les collections temporaire.  

# Map-reduce et sa consommation mémoire

Le pattern map-reduce est un pattern de programmation fonctionnel désormais bien connu. Il s'applique à des collections et permet de les filtrer, transformer leur valeur et faire des calculs dessus.

Illustrons ça avec un exemple. Prenons une collection de nombres :

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

où `evenNumbers` est définit ainsi :

```javascript
const evenNumbers = [2, 10, 238];
```

## Map

Nous pouvons transformer ces valeurs en les multipliant par deux :

```javascript
describe('map', () => {
    it('creates a new transformed collection', () => {
        numbers.map((i) => i * 2).should.deep.equal(numbersTimesTwo);
    });
});
```

où `numbersTimesTwo` est définit ainsi :

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

## Gestion mémoire et reactive programming

Dans notre dernier exemple, il est important de noter qu'une nouvelle collection à chaque appel de fonction. Nous créons donc deux collections temporaires.
La consomation mémoire n'est pas un problème en soit : nos machines actuelles gèrent très bien beaucoup de données et les les variables temporaires.
Cependant, cela prends une toute autre importance quand nous regardons cela sous le prisme du [*reactive programming*](https://en.wikipedia.org/wiki/Reactive_programming).
Le paradigme du *reactive programming* est repose sur la capaciter de traîter les données au fur et à mesure de leur disponibilité : c'est la notion de *data flow*.
Or dans notre cas, nous devons attendre que chaque collection temporaire soit fini d'être calculée pour pouvoir passer à l'étape suivante.

Si nous représentons chaque étape par un flèche jaune et chaque élément de notre liste par un trait rouge, nous obtenons un schéma d'execution comme ceci:
https://cdn-images-1.medium.com/max/800/1*mJicJiOZT4M9jwv6kMkwRg.gif (copyright Roman Liutikov https://medium.com/@roman01la/understanding-transducers-in-javascript-3500d3bd9624#.6nxos02jh)

https://cdn-images-1.medium.com/max/800/1*rEOyWd0MTPv_NZvzDaFbkA.gif (copyright Roman Liutikov https://medium.com/@roman01la/understanding-transducers-in-javascript-3500d3bd9624#.6nxos02jh)

# En route vers les transducers

## Reduce à la loupe

`Reduce` à pour but produire un résultat unique à partir d'une collection. Mais cette définition peut être abusé en concidèrant une collection comme étant un résultat à part entière. Ainsi, nous pouvons utiliser réduce pour produire une nouvelle collection :

```javascript
describe('Alternative uses of reduce', () => {
    it('can be used to creates a new collection', () => {
        numbers.reduce((accumulator, element) => accumulator.concat(element), []).should.not.equal(numbers);
        numbers.reduce((accumulator, element) => accumulator.concat(element), []).should.deep.equal(numbers);
    });
});
```

Ceci a peut d'intêret dans un premier temps, je vous l'accorde. Mais en utilisant cette propriété, nous nous rendons compte que :

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

Si nous regardons notre implémentation, nous constatons qu'en fonction du cas d'usage de `reduce` la fonction passé en argument aura toujours la même forme.

## Montons de niveau

Nous pouvons alors définir des fonctions de plus haut niveau (higher order functions) pour mutualiser cette information (principe DRY).

```javascript
const reducer = (accumulator, element) => accumulator.concat(element);

êconst filterer = (predicate) => {
    return (accumulator, element) => predicate(element) ? accumulator.concat(element) : accumulator
};

const mapper = (transform) => {
    return (accumulator, element) => accumulator.concat(transform(element))
};
```

Ainsi, seul l'information du comportement deviens important (comme avec les trois fonctions `filter`,`map`,`reduce`) :

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

Jusque ici, nous créeons toujours des collections temporaires et avons même réduit (légèrement) la lisibilité du code. Cependant, une nouvelle possibilité s'offre à nous : si nous arrivons à *composer nos fonctions* `reducer`, `filterer` et `mapper`, alors nous n'aurons plus qu'une seule fonction à passer à reduce et éviterons ainsi les collections temporaires.

# Les transducers

## Chaîne de responsabilité

En regardant les définitions de nos trois fonctions, nous constatons une dernière répétition : l'appel à `accumulator.concat`. Or ce comportement ne nous interesse réelement que pour la fonction `reducer`.
Nous pouvons utiliser le pattern de chaîne de responsabilité (à la sauce fonctionnelle) pour éviter cette duplication. Il nous suffit de prendre un paramêtre en plus : la prochaine fonction à appliquer sur l'élément que nous appellerons `nextReducer`.

```javascript
const reducer = (accumulator, element) => accumulator.concat(element);

const filtering = (predicate, nextReducer) => {
    return (accumulator, element) => {
        return predicate(element) ? nextReducer(accumulator, element) : accumulator
    };
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

où `evenNumbersTimesTwo` est définit ainsi :

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

Il est important de noter que nous avons ici résolu notre problème de création de collection temporaire !
Ceci étant dit, nous pouvons encore affiner notre implémentation.

## Curryfication

Nous pouvons aller encore un peu plus loin en modifiant légerement notre dernière étape en faisant de la curryfication :

```javascript
const reducer = (accumulator, element) => accumulator.concat(element);

const filtering = (predicate) => {
    return (nextReducer) => {
        return (accumulator, element) => {
            return predicate(element) ? nextReducer(accumulator, element) : accumulator
        };
    }
};

const mapping = (transform) => {
    return (nextReducer) => {
        return (accumulator, element) => nextReducer(accumulator, transform(element));
    }
};
```

Ceci a pour seul effet direct de changer la syntaxe que nous utilisons pour notre transducer :

```javascript
const transducer = filtering((i) => i % 2 == 0)
                            (mapping((element) => element * 2)
                                (reducer));
```

Cependant, nous pouvons désormais faire de l'application partiel et stocker chaque étape de l'application dans une varible. Cela s'avèrera utile sous peut.

## La composition

Afin de pouvoir profiter au mieux de la curryfication, nous avons besoin de pouvoir composer des fonctions. Pour rappel, la composition de fonction consiste à prendre deux fonction `f` et `g` pour en générer une troisiène `h` tel que `h(arguments)=f(g(arguments))`.
Ce qui s'écris très simplement :

```javascript
const compose = (f, g) => (i) => f(g(i));
```

Cette définition de `compose` est suffisante pour notre article bien que ne prenant que deux arguments. Nous laissons cette généralisation comme exercice au lecteur (et dans le repository gitlab ;) ).

## L'application partielle

Nous pouvons alors utiliser la currification et la composition pour faire de l'application partiel de nos fonctions.
Si nous reprenons nos deux exemples d'utilisation de transducers, nous constatons tout le transducer répété à l'excetion du dernier argument.
Nous pouvons éviter cela en créant une nouvelle fonction qui filtre et map mais attends un argument pour savoir comment faire le reduce :

```javascript
const evenAndDouble = compose(filtering((i) => i % 2 == 0), mapping((element) => element * 2));
```

Ce qui nous permet de définir deux transducers différent en ne se concentrant que sur leur différence :

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

Les transducers sont une alternative interessante au classique map-reduce qui produit le même résultat tout en étant plus cohérent avec le paradigme du *reactive programming*.
Le but de l'article était de dé-mystifier le sujet en le ré-implementant. Bien entendu, dans la vie de tous les jours, il est recommandé d'utiliser un librairie déja existante comme [transducers.js](https://github.com/cognitect-labs/transducers-js).
Enfin, tout comme le pattern *map-reduce*, ce pattern n'est pas exclusif à javascript et peut s'adapter à tous les languages ce qui est démontré par l'existance de beaucoup de libraires sur le sujet.