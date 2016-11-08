"use strict";
import chai from 'chai';
chai.should();

const numbers = [1, 2, 10, 23, 238];

describe('Existing functions :', () => {
    describe('filter', () => {
        it('creates a new collection', () => {
            numbers.filter((i) => i % 2 == 0).should.deep.equal([2, 10, 238]);
        });
    });
    describe('map', () => {
        it('creates a new collection', () => {
            numbers.map((i) => i * 2).should.deep.equal([2, 4, 20, 46, 476]);
        });
    });
    describe('reduce', () => {
        it('creates a new object', () => {
            numbers.reduce((accumulator, element) => accumulator + element, 0).should.equal(274);
        });
        it('can be used to creates a new collection', () => {
            numbers.reduce((accumulator, element) => accumulator.concat(element), []).should.not.equal(numbers);
            numbers.reduce((accumulator, element) => accumulator.concat(element), []).should.deep.equal(numbers);
        });
        it('can emulate filter', () => {
            numbers.reduce((accumulator, element) => element % 2 == 0 ? accumulator.concat(element) : accumulator, [])
                .should.deep.equal([2, 10, 238]);
        });
        it('can emulate map', () => {
            numbers.reduce((accumulator, element) => accumulator.concat(element * 2), [])
                .should.deep.equal([2, 4, 20, 46, 476]);
        });
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

    it('use reduce to filter', () => {
        numbers.reduce(filterer((i) => i % 2 == 0), []).should.deep.equal([2, 10, 238]);
    });
});

describe('Mappers', () => {

    const mapper = (transform) => {
        return (accumulator, element) => accumulator.concat(transform(element))
    };

    it('use reduce to map', () => {
        numbers.reduce(mapper((element) => element * 2), []).should.deep.equal([2, 4, 20, 46, 476]);
    });
});

describe('Transducers', () => {

    describe('using a simple implementation', () => {
        const reducer = (accumulator, element) => accumulator.concat(element);

        const filtering = (predicate, nextReducer) => {
            return (accumulator, element) => {
                return predicate(element) ? nextReducer(accumulator, element) : accumulator
            };
        };
        const mapping = (transform, nextReducer) => {
            return (accumulator, element) => nextReducer(accumulator, transform(element));
        };

        var transducer = filtering((i) => i % 2 == 0,
            mapping((element) => element * 2,
                reducer));

        it('compose mappers, filterers and reducers together', () => {
            numbers.reduce(transducer, []).should.deep.equal([4, 20, 476]);
        });
    });

    describe('using curryfication', () => {
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

        var transducer = filtering((i) => i % 2 == 0)
        (mapping((element) => element * 2)
        (reducer));

        it('compose mappers, filterers and reducers together', () => {
            numbers.reduce(transducer, []).should.deep.equal([4, 20, 476]);
        });
    })

});
