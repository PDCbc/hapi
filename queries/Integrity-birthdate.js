function map(patient)
{
  var firstDate = new Date(9999, 0);
  
  patient.encounters().every(
    function(x)
    {
      firstDate = x.startDate() < firstDate ? x.startDate():firstDate;
      return true;
    }
  );
  
  var birthDateString = 
    new Date(patient.json.birthdate * 1000).getFullYear() + '/' + 
    pad(new Date(patient.json.birthdate * 1000).getMonth() + 1) + '/' +
    pad(new Date(patient.json.birthdate * 1000).getUTCDate());
  var firstDateString = 
    firstDate.getFullYear() + '/' + 
    pad((firstDate.getMonth() + 1)) + '/' + 
    pad(firstDate.getUTCDate());
  
  emit( birthDateString + '_' + firstDateString + '_' + patient.json.primary_care_provider_id,1);
  
  function pad(x)
  {
    return x > 9 ? x : '0' + x;
  }
}
