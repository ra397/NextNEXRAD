class ProfileSelector {
    constructor(map, lat, lng, distance_m) {
        this.centerMarker =  this.makeMarker(map, lat, lng, 'red');
        this.circle = this.makeCircle(map, lat, lng, distance_m, '#ff9800');
        this.edgePoint = this.getEdgePoint(lat, lng, distance_m, 0);
        this.profileLine = this.drawProfileLine(map, lat, lng, this.edgePoint.lat, this.edgePoint.lng);
        this.dragMarker = this.makeMarker(map, this.edgePoint.lat, this.edgePoint.lng, 'blue', true);
    }

    makeMarker(map, lat, lng, color, draggable=false) {
        const marker = new google.maps.Marker({
            position: { lat: lat, lng: lng },
            map: map,
            clickable: true,
            icon: {
                path: "M0,0 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0", 
                fillColor: color,
                fillOpacity: 1,
                strokeColor: color,
                strokeWeight: 0,
                scale: 1.5,
            },
            ...(draggable ? { draggable: true } : {})
        });
        marker.setMap(map);
        return marker;
    }

    makeCircle(map, lat, lng, distance_m, borderColor) {
        const circle = new google.maps.Circle({
            center: { lat: lat, lng: lng },
            radius: distance_m,
            map: map,
            strokeColor: borderColor,
            strokeWeight: 1,
            fillOpacity: 0.0,
            clickable: false
        });
        circle.setMap(map);
        return circle;
    }

    getEdgePoint(lat, lng, distance_m, azimuth) {
        const edgePoint = google.maps.geometry.spherical.computeOffset(
            { lat: lat, lng: lng }, distance_m, azimuth
        );
        return { lat: edgePoint.lat(), lng: edgePoint.lng() };
    }

    drawProfileLine(map, centerLat, centerLng, edgeLat, edgeLng) {
        const profileLine = new google.maps.Polyline({
            path: [{ lat: centerLat, lng: centerLng }, { lat: edgeLat, lng: edgeLng }],
            strokeColor: "#000",
            strokeWeight: 1,
            strokeOpacity: 1.0,
        });
        profileLine.setMap(map);
        return profileLine;
    }

    destroy() {
        this.centerMarker.setMap(null);
        this.circle.setMap(null);
        this.profileLine.setMap(null);
        this.dragMarker.setMap(null);

        this.centerMarker = null;
        this.circle = null;
        this.edgePoint = null;
        this.profileLine = null;
    }
}