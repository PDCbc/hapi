// Reference Number: PDC-020
// Query Title: Practice population profile
// TODO: Add freetext definition search
// TODO: Add Colon screening portion of query

function map(patient) {
    var targetLabCodes = {
        "pCLOCD": ["58453-2", "14563-1", "14564-9", "14565-6"]
    };

    var ageLimitLow = 50;
    var ageLimitHigh = 74;
    var resultList = patient.results();

    var now = new Date(2014, 6, 18);
    var start = addDate(now, -2, 0, 0);
    var end = addDate(now, 0, 0, 0);

    // Shifts date by year, month, and date specified
    function addDate(date, y, m, d) {
        var n = new Date(date);
        n.setFullYear(date.getFullYear() + (y || 0));
        n.setMonth(date.getMonth() + (m || 0));
        n.setDate(date.getDate() + (d || 0));
        return n;
    }

    // Checks if patient is in target age range
    function population(patient) {
        return (patient.age(now) >= ageLimitLow && patient.age(now) <= ageLimitHigh);
    }

    // Checks for Hemoccult labs performed within the last 2 years
    function hasLabCode() {
        return resultList.match(targetLabCodes, start, end).length;
    }

    if (population(patient)) {
        emit("denominator", 1);
	emit("denominator_" + patient['json']['primary_care_provider_id'], 1);
        if (hasLabCode()) {
            emit("numerator", 1);
            emit("numerator_" + patient['json']['primary_care_provider_id'], 1);
        }
    }

    // Empty Case
    emit("numerator", 0);
    emit("numerator_" + patient['json']['primary_care_provider_id'], 0);
    emit("denominator", 0);
    emit("denominator_" + patient['json']['primary_care_provider_id'], 1);
}
