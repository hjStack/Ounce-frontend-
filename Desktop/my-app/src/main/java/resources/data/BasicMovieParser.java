package resources.data;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class BasicMovieParser implements MovieParser {

    @Override
    public List<Movie> parse() throws IOException {
        List<Movie> movies=new ArrayList<Movie>();
        return movies;
    }
}