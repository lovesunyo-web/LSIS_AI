/*
 * Full Spec Requirements Library
 * --------------------------------------------------------------------------
 * A small, browser-only library for managing approved (or draft) material and
 * test requirements independently from a particular Full Spec document.
 *
 * The module intentionally stores requirement metadata, not original standard
 * PDFs.  A requirement always retains its source, edition, clause/table/page,
 * applicability, approval state and evidence reference.
 *
 * Usage:
 *   FullSpecRequirements.load().then(function (library) { ... });
 *   FullSpecRequirements.save(library);
 *   FullSpecRequirements.requirementsForProfile('MP-EPR-INSULATION');
 *
 * No external dependency is required. IndexedDB is the primary store and
 * localStorage is used only as a compatibility fallback.
 */
(function (root) {
    'use strict';

    if (!root) {
        return;
    }

    var DB_NAME = 'FullSpecRequirementsDB';
    var DB_VERSION = 1;
    var STORE_NAME = 'libraries';
    var LIBRARY_RECORD_ID = 'default-library';
    var SCHEMA_VERSION = 1;
    var FALLBACK_STORAGE_KEY = 'fullSpecRequirements.library.v1';

    var VALID_SOURCE_TYPES = {
        STD: true,
        COMPANY: true,
        PROJECT: true
    };
    var VALID_STATUSES = {
        DRAFT: true,
        REVIEW: true,
        APPROVED: true,
        OBSOLETE: true,
        ARCHIVED: true
    };
    var VALID_TEST_CLASSES = {
        ROUTINE: true,
        TYPE: true,
        SAMPLE: true,
        NONE: true
    };

    function nowIso() {
        return new Date().toISOString();
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function asText(value) {
        if (value === undefined || value === null) {
            return '';
        }
        return String(value).replace(/^\s+|\s+$/g, '');
    }

    function clone(value) {
        if (value === undefined) {
            return undefined;
        }
        return JSON.parse(JSON.stringify(value));
    }

    function toArray(value) {
        if (Array.isArray(value)) {
            return value;
        }
        return value === undefined || value === null || value === '' ? [] : [value];
    }

    function normalizeSourceType(value) {
        var normalized = asText(value).toUpperCase();
        if (normalized === 'STANDARD' || normalized === 'STANDARDS') {
            normalized = 'STD';
        }
        if (normalized === 'CORPORATE' || normalized === 'INTERNAL') {
            normalized = 'COMPANY';
        }
        if (VALID_SOURCE_TYPES[normalized]) {
            return normalized;
        }
        return 'STD';
    }

    function normalizeStatus(value) {
        var normalized = asText(value).toUpperCase();
        if (normalized === 'IN REVIEW' || normalized === 'IN_REVIEW') {
            normalized = 'REVIEW';
        }
        return VALID_STATUSES[normalized] ? normalized : 'DRAFT';
    }

    function normalizeTestClass(value) {
        var normalized = asText(value).toUpperCase();
        if (normalized === 'ROUTINE TEST') {
            normalized = 'ROUTINE';
        } else if (normalized === 'TYPE TEST') {
            normalized = 'TYPE';
        } else if (normalized === 'SAMPLE TEST') {
            normalized = 'SAMPLE';
        }
        return VALID_TEST_CLASSES[normalized] ? normalized : 'NONE';
    }

    function defaultAppliesWhen() {
        return {
            profileId: '',
            cableFamily: '',
            voltage: '',
            conductor: '',
            material: '',
            layer: '',
            hasArmour: '',
            firePerformance: '',
            productRef: '',
            notes: ''
        };
    }

    function normalizeAppliesWhen(value) {
        var output = defaultAppliesWhen();
        var key;

        if (typeof value === 'string') {
            output.notes = asText(value);
            return output;
        }
        if (!isObject(value)) {
            return output;
        }

        for (key in output) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                if (key === 'hasArmour' && typeof value[key] === 'boolean') {
                    output[key] = value[key];
                } else if (Array.isArray(value[key])) {
                    output[key] = value[key].map(asText).filter(function (item) {
                        return item !== '';
                    });
                } else {
                    output[key] = asText(value[key]);
                }
            }
        }

        return output;
    }

    function makeGeneratedId(prefix, number) {
        var suffix = String(number + 1);
        while (suffix.length < 3) {
            suffix = '0' + suffix;
        }
        return prefix + '-' + suffix;
    }

    function uniqueId(candidate, prefix, number, seen) {
        var base = asText(candidate) || makeGeneratedId(prefix, number);
        var next = base;
        var attempt = 2;

        while (seen[next]) {
            next = base + '-' + attempt;
            attempt += 1;
        }
        seen[next] = true;
        return next;
    }

    /*
     * Every editable row uses this common metadata shape. A few fields do not
     * apply to source/profile rows, but retaining empty fields makes imports,
     * exports and table editors predictable.
     */
    function baseRecord(kind) {
        return {
            id: '',
            recordType: kind,
            sourceId: '',
            sourceType: 'STD',
            standard: '',
            edition: '',
            clause: '',
            table: '',
            page: '',
            category: '',
            layer: '',
            material: '',
            property: '',
            test: '',
            comparator: '',
            value: '',
            unit: '',
            condition: '',
            method: '',
            methodClause: '',
            appliesWhen: defaultAppliesWhen(),
            testClass: 'NONE',
            evidence: '',
            status: 'DRAFT',
            reviewedBy: '',
            reviewedAt: '',
            title: '',
            name: '',
            description: '',
            notes: ''
        };
    }

    function normalizeRecord(input, kind, number, seen) {
        var source = isObject(input) ? input : {};
        var output = baseRecord(kind);
        var key;

        output.id = uniqueId(
            source.id,
            kind === 'source' ? 'SRC' : (kind === 'profile' ? 'MP' : 'REQ'),
            number,
            seen
        );
        output.recordType = kind;
        output.sourceId = asText(source.sourceId || source.sourceRef);
        output.sourceType = normalizeSourceType(source.sourceType);
        output.standard = asText(source.standard);
        output.edition = asText(source.edition);
        output.clause = asText(source.clause);
        output.table = asText(source.table);
        output.page = asText(source.page);
        output.category = asText(source.category).toLowerCase();
        output.layer = asText(source.layer);
        output.material = asText(source.material);
        output.property = asText(source.property);
        output.test = asText(source.test);
        output.comparator = asText(source.comparator);
        output.value = asText(source.value);
        output.unit = asText(source.unit);
        output.condition = asText(source.condition);
        output.method = asText(source.method);
        output.methodClause = asText(source.methodClause);
        output.appliesWhen = normalizeAppliesWhen(source.appliesWhen);
        output.testClass = normalizeTestClass(source.testClass);
        output.evidence = asText(source.evidence);
        output.status = normalizeStatus(source.status);
        output.reviewedBy = asText(source.reviewedBy);
        output.reviewedAt = asText(source.reviewedAt);
        output.title = asText(source.title);
        output.name = asText(source.name);
        output.description = asText(source.description);
        output.notes = asText(source.notes);

        if (kind === 'source') {
            output.title = output.title || output.name || output.standard || output.id;
            output.name = output.name || output.title;
        } else if (kind === 'profile') {
            output.category = 'material';
            output.name = output.name || output.title || output.material || output.id;
            output.title = output.title || output.name;
        } else {
            output.category = output.category === 'test' ? 'test' : 'material';
            output.title = output.title || output.test || output.property || output.id;
        }

        /*
         * Preserve extra fields added by later UI versions. This makes the
         * versioned store forward-friendly while keeping core fields normalized.
         */
        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key) &&
                !Object.prototype.hasOwnProperty.call(output, key)) {
                output[key] = clone(source[key]);
            }
        }

        return output;
    }

    function normalizeCollection(value, kind) {
        var rows = toArray(value);
        var result = [];
        var seen = {};
        var index;

        for (index = 0; index < rows.length; index += 1) {
            result.push(normalizeRecord(rows[index], kind, index, seen));
        }
        return result;
    }

    function tryParse(value) {
        if (typeof value !== 'string') {
            return value;
        }
        try {
            return JSON.parse(value);
        } catch (error) {
            return {};
        }
    }

    function normalizeLibrary(input) {
        var raw = tryParse(input);
        var candidate = isObject(raw) && isObject(raw.library) ? raw.library : raw;
        var timestamp = nowIso();
        var library;
        var key;

        if (!isObject(candidate)) {
            candidate = {};
        }

        library = {
            libraryId: asText(candidate.libraryId || candidate.id) || LIBRARY_RECORD_ID,
            schemaVersion: SCHEMA_VERSION,
            title: asText(candidate.title) || 'Full Spec Requirement Library',
            createdAt: asText(candidate.createdAt) || timestamp,
            updatedAt: asText(candidate.updatedAt) || timestamp,
            sources: normalizeCollection(candidate.sources, 'source'),
            materialProfiles: normalizeCollection(candidate.materialProfiles, 'profile'),
            requirements: normalizeCollection(candidate.requirements, 'requirement'),
            notes: asText(candidate.notes)
        };

        for (key in candidate) {
            if (Object.prototype.hasOwnProperty.call(candidate, key) &&
                !Object.prototype.hasOwnProperty.call(library, key)) {
                library[key] = clone(candidate[key]);
            }
        }

        return library;
    }

    /*
     * Seed records intentionally contain no numeric requirement values. They
     * are editable examples only and remain DRAFT until a reviewer registers
     * values from an approved standard/company/project source.
     */
    function createSeedLibrary() {
        var timestamp = nowIso();
        return normalizeLibrary({
            libraryId: LIBRARY_RECORD_ID,
            title: 'Full Spec Requirement Library',
            createdAt: timestamp,
            updatedAt: timestamp,
            notes: 'Seed entries are editable DRAFT examples. Verify every value and source before approval.',
            sources: [
                {
                    id: 'SRC-IEC-60092-353-2011',
                    sourceType: 'STD',
                    title: 'IEC 60092-353 reference (edition to be confirmed for the project)',
                    standard: 'IEC 60092-353',
                    edition: 'Ed. 3.0 (2011)',
                    clause: '',
                    table: '',
                    page: '',
                    status: 'DRAFT',
                    notes: 'Reference placeholder only. Confirm the contractual edition and applicable companion standards.'
                },
                {
                    id: 'SRC-COMPANY-APPROVED-SPEC',
                    sourceType: 'COMPANY',
                    title: 'Company approved material/specification source',
                    standard: '',
                    edition: '',
                    clause: '',
                    table: '',
                    page: '',
                    status: 'DRAFT',
                    notes: 'Register the controlled document number, revision and approval before use.'
                },
                {
                    id: 'SRC-PROJECT-OVERRIDE',
                    sourceType: 'PROJECT',
                    title: 'Project-specific approved deviation or override',
                    standard: '',
                    edition: '',
                    clause: '',
                    table: '',
                    page: '',
                    status: 'DRAFT',
                    notes: 'Use only for documented project requirements; preserve the original source in the library.'
                }
            ],
            materialProfiles: [
                {
                    id: 'MP-EPR-INSULATION',
                    sourceId: 'SRC-IEC-60092-353-2011',
                    sourceType: 'STD',
                    category: 'material',
                    name: 'EPR insulation',
                    title: 'EPR insulation profile',
                    layer: 'Insulation',
                    material: 'EPR',
                    appliesWhen: {
                        material: 'EPR',
                        layer: 'Insulation'
                    },
                    status: 'DRAFT',
                    notes: 'Add project-approved property requirements before using this profile.'
                },
                {
                    id: 'MP-XLPE-INSULATION',
                    sourceId: 'SRC-COMPANY-APPROVED-SPEC',
                    sourceType: 'COMPANY',
                    category: 'material',
                    name: 'XLPE insulation',
                    title: 'XLPE insulation profile',
                    layer: 'Insulation',
                    material: 'XLPE',
                    appliesWhen: {
                        material: 'XLPE',
                        layer: 'Insulation'
                    },
                    status: 'DRAFT',
                    notes: 'Add project-approved property requirements before using this profile.'
                },
                {
                    id: 'MP-SHF1-BEDDING',
                    sourceId: 'SRC-COMPANY-APPROVED-SPEC',
                    sourceType: 'COMPANY',
                    category: 'material',
                    name: 'SHF1 bedding / inner covering',
                    title: 'SHF1 bedding profile',
                    layer: 'Bedding / Inner covering',
                    material: 'SHF1',
                    appliesWhen: {
                        material: 'SHF1',
                        layer: 'Bedding / Inner covering'
                    },
                    status: 'DRAFT',
                    notes: 'Confirm the exact compound designation and required properties.'
                },
                {
                    id: 'MP-SHF1-SHEATH',
                    sourceId: 'SRC-COMPANY-APPROVED-SPEC',
                    sourceType: 'COMPANY',
                    category: 'material',
                    name: 'SHF1 outer sheath',
                    title: 'SHF1 outer sheath profile',
                    layer: 'Outer sheath',
                    material: 'SHF1',
                    appliesWhen: {
                        material: 'SHF1',
                        layer: 'Outer sheath'
                    },
                    status: 'DRAFT',
                    notes: 'Confirm the exact compound designation and required properties.'
                }
            ],
            requirements: [
                {
                    id: 'REQ-EXAMPLE-MAT-EPR-TENSILE',
                    sourceId: 'SRC-IEC-60092-353-2011',
                    sourceType: 'STD',
                    standard: 'IEC 60092-353',
                    edition: 'Ed. 3.0 (2011)',
                    category: 'material',
                    layer: 'Insulation',
                    material: 'EPR',
                    property: 'Tensile strength',
                    comparator: '>=',
                    value: '',
                    unit: 'N/mm²',
                    condition: 'Unaged; enter the approved source condition and value.',
                    method: '',
                    methodClause: '',
                    appliesWhen: {
                        profileId: 'MP-EPR-INSULATION',
                        material: 'EPR',
                        layer: 'Insulation'
                    },
                    testClass: 'TYPE',
                    evidence: 'Approved type test report',
                    status: 'DRAFT',
                    notes: 'Example row only; no requirement value has been approved.'
                },
                {
                    id: 'REQ-EXAMPLE-MAT-SHF1-HALOGEN',
                    sourceId: 'SRC-COMPANY-APPROVED-SPEC',
                    sourceType: 'COMPANY',
                    category: 'material',
                    layer: 'Outer sheath',
                    material: 'SHF1',
                    property: 'Halogen acid gas property',
                    comparator: 'PASS',
                    value: 'Comply with the approved source',
                    unit: '',
                    condition: 'Applicable to the selected halogen-free sheath compound.',
                    method: '',
                    methodClause: '',
                    appliesWhen: {
                        profileId: 'MP-SHF1-SHEATH',
                        material: 'SHF1',
                        layer: 'Outer sheath',
                        firePerformance: 'Halogen-free'
                    },
                    testClass: 'TYPE',
                    evidence: 'Approved type test report',
                    status: 'DRAFT',
                    notes: 'Example row only; complete the source clause and acceptance criteria.'
                },
                {
                    id: 'REQ-EXAMPLE-TEST-ROUTINE-VOLTAGE',
                    sourceId: 'SRC-IEC-60092-353-2011',
                    sourceType: 'STD',
                    standard: 'IEC 60092-353',
                    edition: 'Ed. 3.0 (2011)',
                    category: 'test',
                    layer: 'Completed cable',
                    test: 'Routine voltage test',
                    comparator: 'PASS',
                    value: 'As specified by the approved source',
                    unit: '',
                    condition: 'Apply to the completed cable when required by the approved source.',
                    method: '',
                    methodClause: '',
                    appliesWhen: {
                        cableFamily: ''
                    },
                    testClass: 'ROUTINE',
                    evidence: 'Routine test report',
                    status: 'DRAFT',
                    notes: 'Example row only; set the exact test voltage, duration and source clause after review.'
                },
                {
                    id: 'REQ-EXAMPLE-TEST-SAMPLE-DIMENSION',
                    sourceId: 'SRC-COMPANY-APPROVED-SPEC',
                    sourceType: 'COMPANY',
                    category: 'test',
                    layer: 'Completed cable',
                    test: 'Dimensional verification',
                    comparator: 'PASS',
                    value: 'Within the approved drawing or table tolerance',
                    unit: '',
                    condition: 'Apply to the selected product data package.',
                    method: '',
                    methodClause: '',
                    appliesWhen: {
                        cableFamily: ''
                    },
                    testClass: 'SAMPLE',
                    evidence: 'Inspection record',
                    status: 'DRAFT',
                    notes: 'Example row only; record the controlled drawing/table reference and sampling frequency.'
                }
            ]
        });
    }

    function openDatabase() {
        return new Promise(function (resolve, reject) {
            var request;

            if (!root.indexedDB) {
                reject(new Error('IndexedDB is not available.'));
                return;
            }

            try {
                request = root.indexedDB.open(DB_NAME, DB_VERSION);
            } catch (error) {
                reject(error);
                return;
            }

            request.onupgradeneeded = function (event) {
                var database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = function (event) {
                resolve(event.target.result);
            };
            request.onerror = function () {
                reject(request.error || new Error('Could not open the requirements library database.'));
            };
            request.onblocked = function () {
                reject(new Error('Requirements library database is blocked by another browser tab.'));
            };
        });
    }

    function readFromIndexedDb() {
        return openDatabase().then(function (database) {
            return new Promise(function (resolve, reject) {
                var transaction;
                var request;

                try {
                    transaction = database.transaction(STORE_NAME, 'readonly');
                    request = transaction.objectStore(STORE_NAME).get(LIBRARY_RECORD_ID);
                } catch (error) {
                    database.close();
                    reject(error);
                    return;
                }

                request.onsuccess = function () {
                    database.close();
                    resolve(request.result && request.result.library ? request.result.library : null);
                };
                request.onerror = function () {
                    database.close();
                    reject(request.error || new Error('Could not read the requirements library.'));
                };
            });
        });
    }

    function writeToIndexedDb(library) {
        return openDatabase().then(function (database) {
            return new Promise(function (resolve, reject) {
                var transaction;
                var store;

                try {
                    transaction = database.transaction(STORE_NAME, 'readwrite');
                    store = transaction.objectStore(STORE_NAME);
                    store.put({
                        id: LIBRARY_RECORD_ID,
                        schemaVersion: SCHEMA_VERSION,
                        updatedAt: library.updatedAt,
                        library: clone(library)
                    });
                } catch (error) {
                    database.close();
                    reject(error);
                    return;
                }

                transaction.oncomplete = function () {
                    database.close();
                    resolve();
                };
                transaction.onerror = function () {
                    database.close();
                    reject(transaction.error || new Error('Could not save the requirements library.'));
                };
                transaction.onabort = function () {
                    database.close();
                    reject(transaction.error || new Error('Saving the requirements library was aborted.'));
                };
            });
        });
    }

    function readFromFallback() {
        var raw;
        try {
            if (!root.localStorage) {
                return null;
            }
            raw = root.localStorage.getItem(FALLBACK_STORAGE_KEY);
            return raw ? tryParse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function writeToFallback(library) {
        try {
            if (!root.localStorage) {
                throw new Error('No browser storage is available.');
            }
            root.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(library));
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    function readPersistedLibrary() {
        return readFromIndexedDb().then(function (library) {
            return library || readFromFallback();
        }, function () {
            return readFromFallback();
        });
    }

    function writePersistedLibrary(library) {
        return writeToIndexedDb(library).catch(function () {
            return writeToFallback(library);
        });
    }

    function load() {
        return readPersistedLibrary().then(function (stored) {
            var library;

            if (!stored) {
                library = createSeedLibrary();
                return writePersistedLibrary(library).then(function () {
                    return clone(library);
                }, function () {
                    /* A private/incognito context may disallow storage. */
                    return clone(library);
                });
            }

            library = normalizeLibrary(stored);
            return clone(library);
        });
    }

    function save(input) {
        if (input === undefined || input === null) {
            return load().then(function (library) {
                return save(library);
            });
        }

        var library = normalizeLibrary(input);
        library.updatedAt = nowIso();

        return writePersistedLibrary(library).then(function () {
            return clone(library);
        });
    }

    function resetToSeed() {
        return save(createSeedLibrary());
    }

    function resolveLibrary(input) {
        if (input === undefined || input === null) {
            return load();
        }
        return Promise.resolve(normalizeLibrary(input));
    }

    function countBy(rows, field) {
        var counts = {};
        rows.forEach(function (row) {
            var key = asText(row[field]) || 'UNSPECIFIED';
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }

    function summarize(input) {
        return resolveLibrary(input).then(function (library) {
            return {
                libraryId: library.libraryId,
                schemaVersion: library.schemaVersion,
                updatedAt: library.updatedAt,
                sources: library.sources.length,
                materialProfiles: library.materialProfiles.length,
                requirements: library.requirements.length,
                requirementsByStatus: countBy(library.requirements, 'status'),
                requirementsByCategory: countBy(library.requirements, 'category'),
                requirementsByTestClass: countBy(library.requirements, 'testClass'),
                approvedRequirements: library.requirements.filter(function (row) {
                    return row.status === 'APPROVED';
                }).length,
                draftRequirements: library.requirements.filter(function (row) {
                    return row.status === 'DRAFT';
                }).length
            };
        });
    }

    function copyContext(input) {
        var output = {};
        var key;
        if (!isObject(input)) {
            return output;
        }
        for (key in input) {
            if (Object.prototype.hasOwnProperty.call(input, key)) {
                output[key] = input[key];
            }
        }
        return output;
    }

    function isBlankRule(value) {
        return value === undefined || value === null || value === '' ||
            (Array.isArray(value) && value.length === 0) || value === '*';
    }

    function normalizedValues(value) {
        var values = Array.isArray(value) ? value : asText(value).split(/[|,]/);
        return values.map(function (item) {
            return asText(item).toLowerCase();
        }).filter(function (item) {
            return item !== '';
        });
    }

    function ruleMatches(rule, actual) {
        var accepted;
        var actualValues;
        var index;

        if (isBlankRule(rule)) {
            return true;
        }
        if (actual === undefined || actual === null || actual === '') {
            return false;
        }
        if (typeof rule === 'boolean') {
            return rule === actual || String(rule) === String(actual).toLowerCase();
        }

        accepted = normalizedValues(rule);
        actualValues = normalizedValues(actual);
        for (index = 0; index < actualValues.length; index += 1) {
            if (accepted.indexOf(actualValues[index]) !== -1) {
                return true;
            }
        }
        return false;
    }

    function appliesToContext(requirement, context) {
        var rule = normalizeAppliesWhen(requirement.appliesWhen);
        var keys = [
            'profileId',
            'cableFamily',
            'voltage',
            'conductor',
            'material',
            'layer',
            'hasArmour',
            'firePerformance',
            'productRef'
        ];
        var index;

        for (index = 0; index < keys.length; index += 1) {
            if (!ruleMatches(rule[keys[index]], context[keys[index]])) {
                return false;
            }
        }
        if (!ruleMatches(requirement.material, context.material)) {
            return false;
        }
        if (!ruleMatches(requirement.layer, context.layer)) {
            return false;
        }
        return true;
    }

    function sortRows(rows) {
        return rows.sort(function (left, right) {
            return asText(left.id).localeCompare(asText(right.id));
        });
    }

    function looksLikeLibrary(value) {
        return isObject(value) && (
            Array.isArray(value.sources) ||
            Array.isArray(value.materialProfiles) ||
            Array.isArray(value.requirements) ||
            isObject(value.library)
        );
    }

    function findProfile(library, profile) {
        var profileId = typeof profile === 'string' ? profile : (profile && profile.id);
        var found = null;

        library.materialProfiles.some(function (row) {
            if (row.id === profileId) {
                found = row;
                return true;
            }
            return false;
        });
        return found || (isObject(profile) ? normalizeRecord(profile, 'profile', 0, {}) : null);
    }

    /*
     * Find material requirements for a profile. The optional context may add
     * cable-family, voltage, fire-performance and product-specific filters.
     *
     * Supported call forms:
     *   requirementsForProfile(profileId)
     *   requirementsForProfile(profileId, context)
     *   requirementsForProfile(profileId, context, library)
     *   requirementsForProfile(profileId, library)
     */
    function requirementsForProfile(profile, context, input) {
        var suppliedContext = context;
        var suppliedLibrary = input;

        if (looksLikeLibrary(context) && input === undefined) {
            suppliedLibrary = context;
            suppliedContext = {};
        }

        return resolveLibrary(suppliedLibrary).then(function (library) {
            var selectedProfile = findProfile(library, profile);
            var matchContext = copyContext(suppliedContext);
            var result;

            if (!selectedProfile) {
                return [];
            }

            if (matchContext.profileId === undefined || matchContext.profileId === '') {
                matchContext.profileId = selectedProfile.id;
            }
            if (matchContext.material === undefined || matchContext.material === '') {
                matchContext.material = selectedProfile.material;
            }
            if (matchContext.layer === undefined || matchContext.layer === '') {
                matchContext.layer = selectedProfile.layer;
            }

            result = library.requirements.filter(function (requirement) {
                return requirement.category === 'material' && appliesToContext(requirement, matchContext);
            });
            return clone(sortRows(result));
        });
    }

    /*
     * Find Routine/Type/Sample test rows that apply to a cable context.
     * Pass an optional library as the second argument to use an unsaved draft.
     */
    function testsForContext(context, input) {
        return resolveLibrary(input).then(function (library) {
            var matchContext = copyContext(context);
            var result = library.requirements.filter(function (requirement) {
                return requirement.category === 'test' && appliesToContext(requirement, matchContext);
            });
            return clone(sortRows(result));
        });
    }

    function exportSnapshot(input, options) {
        var settings = isObject(options) ? options : {};

        return resolveLibrary(input).then(function (library) {
            var exportedAt = nowIso();
            var filenameTime = exportedAt.replace(/[:.]/g, '-');
            var snapshot = {
                format: 'FullSpecRequirementsSnapshot',
                schemaVersion: SCHEMA_VERSION,
                exportedAt: exportedAt,
                filename: 'full-spec-requirements-' + filenameTime + '.json',
                library: clone(library)
            };

            if (settings.includeJson !== false) {
                snapshot.json = JSON.stringify(snapshot, null, settings.pretty === false ? 0 : 2);
            }
            return snapshot;
        });
    }

    /*
     * Public normalizer intentionally returns a Promise, matching the rest of
     * the API. Internally the transformation stays synchronous and side-effect
     * free, which is useful for forms before their data is saved.
     */
    function normalize(input) {
        return Promise.resolve(normalizeLibrary(input));
    }

    root.FullSpecRequirements = {
        version: SCHEMA_VERSION,
        load: load,
        save: save,
        resetToSeed: resetToSeed,
        summarize: summarize,
        requirementsForProfile: requirementsForProfile,
        testsForContext: testsForContext,
        exportSnapshot: exportSnapshot,
        normalize: normalize
    };
}(typeof window !== 'undefined' ? window : this));
