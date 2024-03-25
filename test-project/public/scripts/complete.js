$(document).ready(function(){
    $('.cityStateInput').keyup(function(){
        var searchText = $(this).val();
        if(searchText.length > 2){
            $.getJSON('https://nominatim.openstreetmap.org/search?format=json&q=' + searchText, function(data){
                var cities = [];
                $.each(data, function(key, val){
                    var city = val.display_name;
                    cities.push(city);
                });
                $('.cityStateInput').autocomplete({
                    source: cities
                });
            });
        }
    });
});