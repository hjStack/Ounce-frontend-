package resources.data;

import java.util.List;

public class MovieMain {

    public static void main(String[] args) {
        //MovieParser movieParser = new BasicMovieParser();
        MovieParser movieParser = new ApacheCommonsCsvMovieParser();

        try {
            List<Movie> movieList = movieParser.parse();
            for(Movie movie : movieList){
                System.out.println(movie);
            }
        }catch (Exception e){
            System.out.println(e.getMessage());
        }
    }

}