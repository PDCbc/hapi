// Reference Number: PDC-001
// Query Title: Practice population profile
// TODO: Factor in Clinical Encounters
function map(patient) {
    var age = patient.age(new Date(Date.now()));
    var genderValue = patient.gender();

    if (typeof age === 'undefined')
    {
      emit("age_unspecified", 1);
      emit("denominator", 1);
      return;
    }
  
    age = Math.floor(age);
    
    if (genderValue !== null && genderValue !== undefined) {
        if (patient.gender().toUpperCase() === "M") {
            gender = "male";
        } else if (patient.gender().toUpperCase() === "F") {
            gender = "female";
        } else {
            gender = "undifferentiated";
        }
    } else {
        gender = "undifferentiated";
    }
    
    for(i=0, j=9;i<=90; i+=10,j+=10)
    { 
      if(i==90)
      {
        emit(gender + '_90+_' + patient.json.primary_care_provider_id, 1);
      }
      else if(age>=i && age<=j)
      {
        emit(gender + '_' + i.toString() + '-' + j.toString() + '_' + patient.json.primary_care_provider_id, 1);
        break;
      }
    }
    
    emit("denominator", 1);
}
