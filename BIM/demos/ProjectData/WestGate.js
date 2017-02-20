var projectData = {
    models: [
        { url: 'sunhelper.dae', castshadow: false, receiveshadow: false, helper: true },
        { url: 'site.gdae', castshadow: false, receiveshadow: true },
        { url: 'A-blocks-site.gdae', castshadow: true, receiveshadow: true },
        { url: 'trees-cross.dae', castshadow: false, receiveshadow: false },
        { url: 'H-blocks.gdae', castshadow: true, receiveshadow: true, pickable: true, annotate: true },
        { url: 'A-blocks.gdae', castshadow: true, receiveshadow: true, pickable: true, annotate: true },
    ],
    metaformat: {
        name: { name: 'Name' },
        unit: { name: 'Unit' },
        url: { name: 'Website', type: 'link' },
        address: { name: 'Address' },
        phone: { name: 'Phone' },
    },
    meta: {
        'H-1': {
            general: {
                name: 'West Gate Business Park',
                unit: 'H1',
                url: 'http://westgatepark.ro/en/office-buildings/',
            },
            firms: [
                {
                    name: 'Renault',
                    address: 'Clădirea H1, Bulevardul Iuliu Maniu, București, Romania',
                    url: 'https://www.renault.ro/',
                    phone: '+40 21 316 4187',
                },
                {
                    name: 'Accenture Romania',
                    address: 'Clădirea H1, Bulevardul Iuliu Maniu, București, Romania',
                    url: 'https://www.accenture.com/ro-en/',
                    phone: '+40 21 316 4187',
                },
                {
                    name: 'WNS GS Romania',
                    address: 'Clădirea H1, Bulevardul Iuliu Maniu, București, Romania',
                    url: 'http://www.wns.com/about-wns/global-presence/romania',
                    phone: '+40 372 303 000',
                },
            ],
        },
        'H-2': {
            general: {
                name: 'West Gate Business Park',
                unit: 'H2',
                url: 'http://westgatepark.ro/en/office-buildings/',
            },
            firms: [
                {
                    name: 'Alpha Bank',
                    address: 'Bulevardul Preciziei 24, București, Romania',
                    url: 'https://www.alphabank.ro/'
                },
            ],
        },
        'H-3': {
            general: {
                name: 'West Gate Business Park',
                unit: 'H3',
                url: 'http://westgatepark.ro/en/office-buildings/',
            },
        },
        'H-4': {
            general: {
                name: 'West Gate Business Park',
                unit: 'H4',
                url: 'http://westgatepark.ro/en/office-buildings/',
            },
            firms: [
                {
                    name: 'Ericsson Sourcing Services',
                    address: 'Preciziei 24, H4, Floor 1, Strada Preciziei 24, București, Romania',
                    url: 'https://www.ericsson.com/'
                },
                {
                    name: 'Panasonic Marketing',
                    address: 'West Gate Park, Clădirea H4, Bulevardul Preciziei 24, Bucharest 062204, Romania',
                    phone: '+40 21 316 4187',
                    url: 'http://www.panasonic.com/ro/'
                },
            ],
        },
        'H-5': {
            general: {
                name: 'West Gate Business Park',
                unit: 'H5',
                url: 'http://westgatepark.ro/en/office-buildings/',
            },
            firms: [
                {
                    name: 'Panasonic',
                    address: 'West Gate Park, Clădirea H5, Parter, E0-22, Bulevardul Preciziei 24, Bucharest 062204, Romania',
                    phone: '+40 21 316 4187',
                    url: 'http://www.panasonic.com/ro/'
                },
            ],
        },
        'A-block': {
            general: {
                name: 'West Gate Studios',
                unit: 'B2',
                url: 'http://westgatepark.ro/en/west-gate-studios-en/',
            },
            firms: [
            ],
        },
        'A-block-2': {
            general: {
                name: 'West Gate Studios',
                unit: 'B1',
                url: 'http://westgatepark.ro/en/west-gate-studios-en/',
            },
            firms: [
            ],
        },
        'A-block-long': {
            general: {
                name: 'West Gate Studios',
                unit: 'A',
                url: 'http://westgatepark.ro/en/west-gate-studios-en/',
            },
            firms: [
            ],
        },
        'A-block-annex': {
            general: {
                name: 'Conference Center West Gate',
            },
            firms: [
            ],
        },
        'A-block-annex2': {
            general: {
                name: 'Exposition Center West Gate',
            },
            firms: [
            ],
        },
    },

};
