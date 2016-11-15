"use strict";
import chai from 'chai';
chai.should();

const numbers = [1, 2, 10, 23, 238];
const evenNumbers = [2, 10, 238];
const numbersTimesTwo = [2, 4, 20, 46, 476];
const evenNumbersTimesTwo = [4, 20, 476];

describe('Existing functions :', () => {
    describe('filter', () => {
        it('creates a new filtered collection', () => {
            numbers.filter((i) => i % 2 == 0).should.deep.equal(evenNumbers);
        });
    });
    describe('map', () => {
        it('creates a new transformed collection', () => {
            numbers.map((i) => i * 2).should.deep.equal(numbersTimesTwo);
        });
    });
    describe('reduce', () => {
        it('computes a value', () => {
            numbers.reduce((accumulator, element) => accumulator + element, 0).should.equal(274);
        });
    });
    it('can be chained', () => {
        numbers.filter((i) => i % 2 == 0)
            .map((i) => i * 2)
            .reduce((accumulator, element) => accumulator + element, 0).should.equal(500);
    });
});

describe('Alternative uses of reduce', () => {
    it('can be used to creates a new collection', () => {
        numbers.reduce((accumulator, element) => accumulator.concat(element), []).should.not.equal(numbers);
        numbers.reduce((accumulator, element) => accumulator.concat(element), []).should.deep.equal(numbers);
    });
    it('can emulates filter', () => {
        numbers.reduce((accumulator, element) => element % 2 == 0 ? accumulator.concat(element) : accumulator, [])
            .should.deep.equal(evenNumbers);
    });
    it('can emulates map and transform data', () => {
        numbers.reduce((accumulator, element) => accumulator.concat(element * 2), [])
            .should.deep.equal(numbersTimesTwo);
    });
});

describe('Reducer', () => {

    const reducer = (accumulator, element) => accumulator.concat(element);

    it('is a function passed to reduce', () => {
        numbers.reduce(reducer, []).should.not.equal(numbers);
        numbers.reduce(reducer, []).should.deep.equal(numbers);
    });
});

describe('Filterers', () => {

    const filterer = (predicate) => {
        return (accumulator, element) => predicate(element) ? accumulator.concat(element) : accumulator
    };

    it('use reduce to filter data', () => {
        numbers.reduce(filterer((i) => i % 2 == 0), []).should.deep.equal(evenNumbers);
    });
});

describe('Mappers', () => {

    const mapper = (transform) => {
        return (accumulator, element) => accumulator.concat(transform(element))
    };

    it('use reduce to transform data', () => {
        numbers.reduce(mapper((element) => element * 2), []).should.deep.equal(numbersTimesTwo);
    });
});

describe('Transducers', () => {

    describe('using a simple implementation', () => {
        const reducer = (accumulator, element) => accumulator.concat(element);

        const filtering = (predicate, nextReducer) => {
            return (accumulator, element) => predicate(element) ? nextReducer(accumulator, element) : accumulator;
        };
        const mapping = (transform, nextReducer) => {
            return (accumulator, element) => nextReducer(accumulator, transform(element));
        };

        const transducer = filtering((i) => i % 2 == 0,
            mapping((element) => element * 2,
                reducer));

        it('compose mappers, filterers and reducers together', () => {
            numbers.reduce(transducer, []).should.deep.equal(evenNumbersTimesTwo);
        });

        it('can be used to compute the same result as before', () => {
            numbers.reduce(filtering((i) => i % 2 == 0,
                mapping((element) => element * 2,
                    (sum, element) => sum + element)), 0).should.deep.equal(500);
        });
    });

    describe('using curryfication and composition', () => {
        const reducer = (accumulator, element) => accumulator.concat(element);

        const filtering = (predicate) => {
            return (nextReducer) => (accumulator, element) => predicate(element) ? nextReducer(accumulator, element) : accumulator;
        };

        const mapping = (transform) => {
            return (nextReducer) => (accumulator, element) => nextReducer(accumulator, transform(element));
        };

        const compose = (fn, ...fns) => (i) => {
            if (fns.length > 0) {
                return fn(compose.apply(this, fns)(i));
            } else {
                return fn(i);
            }
        };

        const evenAndDouble = compose(filtering((i) => i % 2 == 0), mapping((element) => element * 2));
        const transducer = evenAndDouble(reducer);
        const sumer = evenAndDouble((sum, element) => sum + element);

        it('compose mappers, filterers and reducers together', () => {
            numbers.reduce(transducer, []).should.deep.equal(evenNumbersTimesTwo);
        });

        it('can be used to compute the same result as before', () => {
            numbers.reduce(sumer, 0).should.deep.equal(500);
        });
    })

});
